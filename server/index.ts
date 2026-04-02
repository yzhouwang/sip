import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Database } from 'bun:sqlite'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

// --- Config ---
const PORT = parseInt(process.env.PORT || '3001')
const API_KEY = process.env.SIP_API_KEY || ''
const DATA_DIR = process.env.SIP_DATA_DIR || './data'
const PHOTO_DIR = join(DATA_DIR, 'photos')
const MAX_PHOTO_SIZE = 10 * 1024 * 1024 // 10MB
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
    name TEXT NOT NULL CHECK(length(name) <= 500),
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    hasPhoto INTEGER NOT NULL DEFAULT 0,
    photoFilename TEXT,
    thumbFilename TEXT,
    flavors TEXT NOT NULL DEFAULT '[]',
    notes TEXT NOT NULL DEFAULT '' CHECK(length(notes) <= 10000),
    location TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`)

// --- Validation ---
const VALID_DRINK_TYPES = new Set(['wine', 'whisky', 'beer', 'sake', 'cocktail', 'other'])
const VALID_FLAVORS = new Set([
  'smoky', 'earthy', 'briny', 'sweet', 'floral', 'citrus', 'spicy',
  'fruity', 'rich', 'bitter', 'umami', 'herbal', 'nutty', 'oaky', 'crisp',
])

function validateTasting(body: Record<string, unknown>): string | null {
  if (typeof body.id !== 'string' || !body.id) return 'Missing id'
  if (typeof body.name !== 'string' || !body.name || (body.name as string).length > 500) return 'Invalid name'
  if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5 || !Number.isInteger(body.rating)) return 'Rating must be 1-5'
  if (!VALID_DRINK_TYPES.has(body.drinkType as string)) return 'Invalid drinkType'
  if (!Array.isArray(body.flavors) || body.flavors.length > 5) return 'Invalid flavors'
  for (const f of body.flavors) {
    if (!VALID_FLAVORS.has(f)) return `Invalid flavor: ${f}`
  }
  if (typeof body.notes !== 'string') return 'Invalid notes'
  if (typeof body.location !== 'string') return 'Invalid location'
  if (typeof body.createdAt !== 'string' || isNaN(Date.parse(body.createdAt))) return 'Invalid createdAt'
  if (typeof body.updatedAt !== 'string' || isNaN(Date.parse(body.updatedAt))) return 'Invalid updatedAt'
  return null
}

// --- Prepared statements ---
const stmtGet = db.prepare('SELECT * FROM tastings WHERE id = ?')
const stmtGetAll = db.prepare('SELECT * FROM tastings ORDER BY updatedAt DESC')
const stmtUpsert = db.prepare(`
  INSERT INTO tastings (id, drinkType, name, rating, hasPhoto, flavors, notes, location, createdAt, updatedAt)
  VALUES ($id, $drinkType, $name, $rating, $hasPhoto, $flavors, $notes, $location, $createdAt, $updatedAt)
  ON CONFLICT(id) DO UPDATE SET
    drinkType = excluded.drinkType,
    name = excluded.name,
    rating = excluded.rating,
    hasPhoto = excluded.hasPhoto,
    flavors = excluded.flavors,
    notes = excluded.notes,
    location = excluded.location,
    updatedAt = excluded.updatedAt
`)
const stmtDelete = db.prepare('DELETE FROM tastings WHERE id = ?')
const stmtSetPhoto = db.prepare('UPDATE tastings SET photoFilename = $photo, thumbFilename = $thumb, hasPhoto = 1 WHERE id = $id')

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

// GET /api/tastings — list all
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
    $createdAt: body.createdAt,
    $updatedAt: body.updatedAt,
  })

  return c.json({ ok: true })
})

// DELETE /api/tastings/:id
app.delete('/api/tastings/:id', (c) => {
  const id = c.req.param('id')
  const existing = stmtGet.get(id) as Record<string, unknown> | undefined
  if (!existing) return c.json({ error: 'Not found' }, 404)

  // Delete photo files
  if (existing.photoFilename) {
    Bun.file(join(PHOTO_DIR, existing.photoFilename as string)).exists().then((exists) => {
      if (exists) Bun.file(join(PHOTO_DIR, existing.photoFilename as string)).delete?.()
    })
  }
  if (existing.thumbFilename) {
    Bun.file(join(PHOTO_DIR, existing.thumbFilename as string)).exists().then((exists) => {
      if (exists) Bun.file(join(PHOTO_DIR, existing.thumbFilename as string)).delete?.()
    })
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
  if (photo.size > MAX_PHOTO_SIZE) return c.json({ error: 'Photo too large (max 10MB)' }, 413)

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
