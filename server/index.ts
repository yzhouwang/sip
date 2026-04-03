import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Database } from 'bun:sqlite'
import { mkdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import {
  VALID_DRINK_TYPES, VALID_FLAVORS, VALID_STATUSES,
  MAX_NAME_LENGTH, MAX_NOTES_LENGTH, MAX_FLAVORS_PER_TASTING,
  MIN_RATING, MAX_RATING, MAX_PHOTO_SIZE_BYTES, TOMBSTONE_RETENTION_DAYS,
} from '../shared/constants'

// --- Config ---
const PORT = parseInt(process.env.PORT || '3001')
const API_KEY = process.env.SIP_API_KEY || ''
const DATA_DIR = process.env.SIP_DATA_DIR || './data'
const PHOTO_DIR = join(DATA_DIR, 'photos')
const ALLOWED_ORIGIN = process.env.SIP_CORS_ORIGIN || '*'

if (!API_KEY) {
  console.error('ERROR: SIP_API_KEY environment variable is required')
  process.exit(1)
}

// --- Database ---
await mkdir(PHOTO_DIR, { recursive: true })

const db = new Database(join(DATA_DIR, 'sip.db'), { create: true })
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS tastings (
    id TEXT PRIMARY KEY,
    drinkType TEXT NOT NULL CHECK(drinkType IN ('wine','whisky','beer','sake','cocktail','other')),
    name TEXT NOT NULL CHECK(length(name) <= ${MAX_NAME_LENGTH}),
    rating INTEGER NOT NULL CHECK(rating >= ${MIN_RATING} AND rating <= ${MAX_RATING}),
    hasPhoto INTEGER NOT NULL DEFAULT 0,
    photoFilename TEXT,
    thumbFilename TEXT,
    flavors TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '' CHECK(length(notes) <= ${MAX_NOTES_LENGTH}),
    location TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`)

// --- Schema migrations (idempotent via PRAGMA table_info check) ---
function columnExists(table: string, column: string): boolean {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  return cols.some((c) => c.name === column)
}

// Phase 2 columns
if (!columnExists('tastings', 'status')) {
  db.exec(`ALTER TABLE tastings ADD COLUMN status TEXT DEFAULT 'tasted'`)
  db.exec(`UPDATE tastings SET status = 'tasted' WHERE status IS NULL`)
}
if (!columnExists('tastings', 'latitude')) {
  db.exec('ALTER TABLE tastings ADD COLUMN latitude REAL')
}
if (!columnExists('tastings', 'longitude')) {
  db.exec('ALTER TABLE tastings ADD COLUMN longitude REAL')
}
if (!columnExists('tastings', 'deletedAt')) {
  db.exec('ALTER TABLE tastings ADD COLUMN deletedAt TEXT')
}

// --- Validation ---
const DRINK_SET = new Set(VALID_DRINK_TYPES)
const FLAVOR_SET = new Set(VALID_FLAVORS)
const STATUS_SET = new Set(VALID_STATUSES)

function validateTasting(body: Record<string, unknown>): string | null {
  if (typeof body.id !== 'string' || !body.id) return 'Missing id'
  if (typeof body.name !== 'string' || !body.name || (body.name as string).length > MAX_NAME_LENGTH) return 'Invalid name'
  if (typeof body.rating !== 'number' || body.rating < MIN_RATING || body.rating > MAX_RATING || !Number.isInteger(body.rating)) return `Rating must be ${MIN_RATING}-${MAX_RATING}`
  if (!DRINK_SET.has(body.drinkType as string)) return 'Invalid drinkType'
  if (!Array.isArray(body.flavors) || body.flavors.length > MAX_FLAVORS_PER_TASTING) return 'Invalid flavors'
  for (const f of body.flavors) {
    if (!FLAVOR_SET.has(f)) return `Invalid flavor: ${f}`
  }
  if (typeof body.notes !== 'string') return 'Invalid notes'
  if (typeof body.location !== 'string') return 'Invalid location'
  if (body.status !== undefined && !STATUS_SET.has(body.status as string)) return 'Invalid status'
  if (body.latitude !== undefined && body.latitude !== null && typeof body.latitude !== 'number') return 'Invalid latitude'
  if (body.longitude !== undefined && body.longitude !== null && typeof body.longitude !== 'number') return 'Invalid longitude'
  if (typeof body.createdAt !== 'string' || isNaN(Date.parse(body.createdAt))) return 'Invalid createdAt'
  if (typeof body.updatedAt !== 'string' || isNaN(Date.parse(body.updatedAt))) return 'Invalid updatedAt'
  return null
}

// --- Prepared statements ---
const stmtGet = db.prepare('SELECT * FROM tastings WHERE id = ?')
const stmtGetAll = db.prepare('SELECT * FROM tastings ORDER BY updatedAt DESC')
const stmtUpsert = db.prepare(`
  INSERT INTO tastings (id, drinkType, name, rating, hasPhoto, flavors, notes, location, status, latitude, longitude, deletedAt, createdAt, updatedAt)
  VALUES ($id, $drinkType, $name, $rating, $hasPhoto, $flavors, $notes, $location, $status, $latitude, $longitude, $deletedAt, $createdAt, $updatedAt)
  ON CONFLICT(id) DO UPDATE SET
    drinkType = excluded.drinkType,
    name = excluded.name,
    rating = excluded.rating,
    hasPhoto = excluded.hasPhoto,
    flavors = excluded.flavors,
    notes = excluded.notes,
    location = excluded.location,
    status = excluded.status,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    deletedAt = excluded.deletedAt,
    updatedAt = excluded.updatedAt
`)
const stmtDelete = db.prepare('DELETE FROM tastings WHERE id = ?')
const stmtSetPhoto = db.prepare('UPDATE tastings SET photoFilename = $photo, thumbFilename = $thumb, hasPhoto = 1 WHERE id = $id')

// --- Tombstone purge ---
function purgeTombstones() {
  const cutoff = new Date(Date.now() - TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const rows = db.prepare('SELECT id, photoFilename, thumbFilename FROM tastings WHERE deletedAt IS NOT NULL AND deletedAt < ?').all(cutoff) as { id: string; photoFilename: string | null; thumbFilename: string | null }[]

  for (const row of rows) {
    // Clean up photo files
    if (row.photoFilename) {
      unlink(join(PHOTO_DIR, row.photoFilename)).catch(() => {})
    }
    if (row.thumbFilename) {
      unlink(join(PHOTO_DIR, row.thumbFilename)).catch(() => {})
    }
    stmtDelete.run(row.id)
  }

  if (rows.length > 0) {
    console.log(`Purged ${rows.length} tombstones older than ${TOMBSTONE_RETENTION_DAYS} days`)
  }
}

// Purge on startup
purgeTombstones()
// Purge every 24 hours
setInterval(purgeTombstones, 24 * 60 * 60 * 1000)

// --- App ---
const app = new Hono()

// CORS
app.use('*', cors({
  origin: ALLOWED_ORIGIN,
  allowMethods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type'],
}))

// Auth middleware
app.use('/api/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth || auth !== `Bearer ${API_KEY}`) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

// GET /api/tastings — list all (includes tombstoned, client needs them for sync)
app.get('/api/tastings', (c) => {
  const rows = stmtGetAll.all() as Record<string, unknown>[]
  const tastings = rows.map((row) => ({
    id: row.id,
    drinkType: row.drinkType,
    name: row.name,
    rating: row.rating,
    hasPhoto: !!row.hasPhoto,
    photoUrl: row.photoFilename ? `/api/photos/${row.photoFilename}` : undefined,
    thumbUrl: row.thumbFilename ? `/api/photos/${row.thumbFilename}` : undefined,
    flavors: JSON.parse(row.flavors as string),
    notes: row.notes,
    location: row.location,
    status: row.status || 'tasted',
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    deletedAt: row.deletedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))
  return c.json({ tastings })
})

// PUT /api/tastings/:id — create or update
app.put('/api/tastings/:id', async (c) => {
  const body = await c.req.json() as Record<string, unknown>
  body.id = c.req.param('id')

  const err = validateTasting(body)
  if (err) return c.json({ error: err }, 400)

  stmtUpsert.run({
    $id: body.id,
    $drinkType: body.drinkType,
    $name: body.name,
    $rating: body.rating,
    $hasPhoto: body.hasPhoto ? 1 : 0,
    $flavors: JSON.stringify(body.flavors),
    $notes: body.notes,
    $location: body.location,
    $status: body.status || 'tasted',
    $latitude: body.latitude ?? null,
    $longitude: body.longitude ?? null,
    $deletedAt: body.deletedAt ?? null,
    $createdAt: body.createdAt,
    $updatedAt: body.updatedAt,
  })

  return c.json({ ok: true })
})

// DELETE /api/tastings/:id
app.delete('/api/tastings/:id', async (c) => {
  const id = c.req.param('id')
  const existing = stmtGet.get(id) as Record<string, unknown> | undefined
  if (!existing) return c.json({ error: 'Not found' }, 404)

  // Delete photo files with proper error handling
  if (existing.photoFilename) {
    try {
      await unlink(join(PHOTO_DIR, existing.photoFilename as string))
    } catch (err) {
      console.warn(`Failed to delete photo file ${existing.photoFilename}:`, err)
    }
  }
  if (existing.thumbFilename) {
    try {
      await unlink(join(PHOTO_DIR, existing.thumbFilename as string))
    } catch (err) {
      console.warn(`Failed to delete thumb file ${existing.thumbFilename}:`, err)
    }
  }

  stmtDelete.run(id)
  return c.json({ ok: true })
})

// POST /api/tastings/:id/photo — upload photo
app.post('/api/tastings/:id/photo', async (c) => {
  const id = c.req.param('id')
  const existing = stmtGet.get(id)
  if (!existing) return c.json({ error: 'Tasting not found' }, 404)

  const form = await c.req.formData()
  const photo = form.get('photo') as File | null
  const thumb = form.get('thumb') as File | null

  if (!photo) return c.json({ error: 'No photo file' }, 400)
  if (photo.size > MAX_PHOTO_SIZE_BYTES) return c.json({ error: 'Photo too large (max 10MB)' }, 413)

  const photoFilename = `${id}-photo.jpg`
  const thumbFilename = `${id}-thumb.jpg`

  await Bun.write(join(PHOTO_DIR, photoFilename), photo)
  if (thumb) {
    await Bun.write(join(PHOTO_DIR, thumbFilename), thumb)
  }

  stmtSetPhoto.run({ $id: id, $photo: photoFilename, $thumb: thumb ? thumbFilename : null })
  return c.json({ ok: true, photoUrl: `/api/photos/${photoFilename}`, thumbUrl: thumb ? `/api/photos/${thumbFilename}` : undefined })
})

// GET /api/photos/:filename — serve photo
app.get('/api/photos/:filename', async (c) => {
  const filename = c.req.param('filename')
  // Prevent path traversal
  if (filename.includes('..') || filename.includes('/')) {
    return c.json({ error: 'Invalid filename' }, 400)
  }

  const filepath = join(PHOTO_DIR, filename)
  const file = Bun.file(filepath)

  if (!(await file.exists())) {
    return c.json({ error: 'Not found' }, 404)
  }

  return new Response(file, {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000' },
  })
})

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

console.log(`Sip server running on port ${PORT}`)
export default { port: PORT, fetch: app.fetch }
