import type { Tasting, TastingDTO } from './db'
import { getServerUrl, getApiKey, isSyncConfigured, setLastSyncAt } from './config'
import { VALID_STATUSES } from '../../shared/constants'

// --- DTO validation ---

const VALID_DRINK_TYPES = new Set(['wine', 'whisky', 'beer', 'sake', 'cocktail', 'other'])
const VALID_FLAVORS = new Set([
  'smoky', 'earthy', 'briny', 'sweet', 'floral', 'citrus', 'spicy',
  'fruity', 'rich', 'bitter', 'umami', 'herbal', 'nutty', 'oaky', 'crisp',
])

const VALID_STATUS_SET = new Set(VALID_STATUSES)

/** Validate a DTO from the server. Returns error string or null if valid. */
export function validateDTO(dto: unknown): string | null {
  if (!dto || typeof dto !== 'object') return 'Invalid tasting object'
  const obj = dto as Record<string, unknown>
  if (typeof obj.id !== 'string' || !obj.id) return 'Missing or invalid id'
  if (typeof obj.name !== 'string' || !obj.name) return 'Missing or invalid name'
  if (typeof obj.rating !== 'number' || obj.rating < 1 || obj.rating > 5 || !Number.isInteger(obj.rating)) return 'Rating must be integer 1-5'
  if (typeof obj.drinkType !== 'string' || !VALID_DRINK_TYPES.has(obj.drinkType)) return 'Invalid drinkType'
  if (!Array.isArray(obj.flavors) || obj.flavors.length > 5 || !obj.flavors.every((f: unknown) => typeof f === 'string' && VALID_FLAVORS.has(f))) return 'Invalid flavors'
  if (typeof obj.notes !== 'string') return 'Invalid notes'
  if (typeof obj.location !== 'string') return 'Invalid location'
  if (obj.status !== undefined && !VALID_STATUS_SET.has(obj.status as string)) return 'Invalid status'
  if (obj.latitude !== undefined && typeof obj.latitude !== 'number') return 'Invalid latitude'
  if (obj.longitude !== undefined && typeof obj.longitude !== 'number') return 'Invalid longitude'
  if (obj.deletedAt !== undefined && obj.deletedAt !== null && (typeof obj.deletedAt !== 'string' || isNaN(Date.parse(obj.deletedAt)))) return 'Invalid deletedAt'
  if (typeof obj.createdAt !== 'string' || isNaN(Date.parse(obj.createdAt))) return 'Invalid createdAt'
  if (typeof obj.updatedAt !== 'string' || isNaN(Date.parse(obj.updatedAt))) return 'Invalid updatedAt'
  return null
}

// --- Pure serialization layer (no I/O) ---

export function toDTO(t: Tasting): Omit<TastingDTO, 'photoUrl' | 'thumbUrl'> {
  return {
    id: t.id,
    drinkType: t.drinkType,
    name: t.name,
    rating: t.rating,
    hasPhoto: t.hasPhoto,
    flavors: [...t.flavors],
    notes: t.notes,
    location: t.location,
    status: t.status || 'tasted',
    latitude: t.latitude,
    longitude: t.longitude,
    deletedAt: t.deletedAt?.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}

export function fromDTO(dto: TastingDTO): Omit<Tasting, 'photo' | 'photoThumb'> {
  return {
    id: dto.id,
    drinkType: dto.drinkType,
    name: dto.name,
    rating: dto.rating,
    hasPhoto: dto.hasPhoto,
    flavors: [...dto.flavors],
    notes: dto.notes,
    location: dto.location,
    status: dto.status || 'tasted',
    latitude: dto.latitude,
    longitude: dto.longitude,
    deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : undefined,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
}

/** Detect conflict: both sides changed since last sync */
export function hasConflict(
  local: { updatedAt: Date; lastSyncedAt?: Date },
  server: { updatedAt: string },
): boolean {
  const lastSync = local.lastSyncedAt?.getTime() ?? 0
  const serverDate = parseISODate(server.updatedAt)
  if (!serverDate) return false
  // Both sides changed since last sync
  return serverDate.getTime() > lastSync && local.updatedAt.getTime() > lastSync
}

/** Parse ISO date, return null if invalid */
export function parseISODate(s: string): Date | null {
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/** Should we update local tasting from server? Server wins if newer. */
export function shouldPull(local: { updatedAt: Date }, server: { updatedAt: string }): boolean {
  const serverDate = parseISODate(server.updatedAt)
  if (!serverDate) return false
  return serverDate.getTime() > local.updatedAt.getTime()
}

// --- API client layer ---

type FetchFn = typeof fetch

/** Wrap a fetch call with an AbortController timeout */
function fetchWithTimeout(
  url: string,
  opts: RequestInit,
  timeoutMs: number,
  fetchFn: FetchFn = fetch,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetchFn(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer))
}

const DATA_TIMEOUT = 30_000   // 30s for JSON requests
const PHOTO_TIMEOUT = 60_000  // 60s for photo uploads/downloads

function makeHeaders(): Record<string, string> {
  const key = getApiKey()
  return {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

function baseUrl(): string {
  return getServerUrl() || ''
}

export class SyncError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'SyncError'
    this.status = status
  }
}

/** Push a single tasting to the server */
export async function pushTasting(
  tasting: Tasting,
  fetchFn: FetchFn = fetch,
  skipPhoto?: boolean,
): Promise<void> {
  if (!isSyncConfigured()) return

  const url = `${baseUrl()}/api/tastings/${tasting.id}`
  const dto = toDTO(tasting)

  const res = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: makeHeaders(),
    body: JSON.stringify(dto),
  }, DATA_TIMEOUT, fetchFn)

  if (res.status === 401) throw new SyncError('Authentication failed', 401)
  if (!res.ok) throw new SyncError(`Push failed: ${res.status}`, res.status)

  // Upload photo if exists (separate request), skip if already synced (incremental)
  if (tasting.photo && tasting.hasPhoto && !skipPhoto) {
    await pushPhoto(tasting.id, tasting.photo, tasting.photoThumb, fetchFn)
  }
}

/** Upload photo for a tasting */
async function pushPhoto(
  tastingId: string,
  photo: Blob,
  thumb: Blob | undefined,
  fetchFn: FetchFn = fetch,
): Promise<void> {
  const url = `${baseUrl()}/api/tastings/${tastingId}/photo`
  const form = new FormData()
  form.append('photo', photo, 'photo.jpg')
  if (thumb) form.append('thumb', thumb, 'thumb.jpg')

  const key = getApiKey()
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}` },
    body: form,
  }, PHOTO_TIMEOUT, fetchFn)

  if (!res.ok) throw new SyncError(`Photo upload failed: ${res.status}`, res.status)
}

/** Delete a tasting from the server */
export async function deleteTastingFromServer(
  id: string,
  fetchFn: FetchFn = fetch,
): Promise<void> {
  if (!isSyncConfigured()) return

  const url = `${baseUrl()}/api/tastings/${id}`
  const res = await fetchWithTimeout(url, {
    method: 'DELETE',
    headers: makeHeaders(),
  }, DATA_TIMEOUT, fetchFn)

  // 404 is fine — already deleted on server
  if (res.status === 404) return
  if (res.status === 401) throw new SyncError('Authentication failed', 401)
  if (!res.ok) throw new SyncError(`Delete failed: ${res.status}`, res.status)
}

/** Pull all tastings from the server */
export async function pullAll(
  fetchFn: FetchFn = fetch,
): Promise<TastingDTO[]> {
  if (!isSyncConfigured()) return []

  const url = `${baseUrl()}/api/tastings`
  const res = await fetchWithTimeout(url, {
    method: 'GET',
    headers: makeHeaders(),
  }, DATA_TIMEOUT, fetchFn)

  if (res.status === 401) throw new SyncError('Authentication failed', 401)
  if (!res.ok) throw new SyncError(`Pull failed: ${res.status}`, res.status)

  const data = await res.json()
  const raw = data.tastings
  if (!Array.isArray(raw)) throw new SyncError('Invalid server response: tastings is not an array')

  // Validate each DTO before trusting it
  const valid: TastingDTO[] = []
  for (const dto of raw) {
    const err = validateDTO(dto)
    if (err) {
      console.warn(`Skipping invalid tasting from server (${dto?.id ?? 'unknown'}): ${err}`)
      continue
    }
    valid.push(dto as TastingDTO)
  }
  return valid
}

/** Download a photo by URL and return as Blob */
export async function downloadPhoto(
  photoPath: string,
  fetchFn: FetchFn = fetch,
): Promise<Blob> {
  const url = `${baseUrl()}${photoPath}`
  const key = getApiKey()
  const res = await fetchWithTimeout(url, {
    headers: { 'Authorization': `Bearer ${key}` },
  }, PHOTO_TIMEOUT, fetchFn)

  if (!res.ok) throw new SyncError(`Photo download failed: ${res.status}`, res.status)
  return res.blob()
}

/** Test connection to the server */
export async function testConnection(
  fetchFn: FetchFn = fetch,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSyncConfigured()) return { ok: false, error: 'Not configured' }

  try {
    const url = `${baseUrl()}/api/tastings`
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      headers: makeHeaders(),
    }, DATA_TIMEOUT, fetchFn)

    if (res.status === 401) return { ok: false, error: 'Invalid API key' }
    if (!res.ok) return { ok: false, error: `Server error: ${res.status}` }
    return { ok: true }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, error: 'Connection timed out (30s)' }
    }
    return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' }
  }
}

// --- Module-level debounce for sync ---

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pendingIds = new Set<string>()

export type SyncStatusListener = (status: SyncStatus) => void
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success'

let statusListeners: SyncStatusListener[] = []
let currentStatus: SyncStatus = 'idle'

export function onSyncStatus(listener: SyncStatusListener): () => void {
  statusListeners.push(listener)
  listener(currentStatus) // immediate current state
  return () => {
    statusListeners = statusListeners.filter((l) => l !== listener)
  }
}

function setStatus(s: SyncStatus) {
  currentStatus = s
  statusListeners.forEach((l) => l(s))
}

export function getSyncStatus(): SyncStatus {
  return currentStatus
}

/** Schedule a sync for a tasting (debounced 1s) */
export function schedulePush(tastingId: string): void {
  if (!isSyncConfigured()) return
  pendingIds.add(tastingId)

  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(flushPending, 1000)
}

/** Flush all pending syncs immediately */
export async function flushPending(): Promise<void> {
  if (pendingIds.size === 0) return
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  const ids = [...pendingIds]
  pendingIds.clear()

  setStatus('syncing')
  const failedIds: string[] = []
  try {
    const { db } = await import('./db')  // lazy to break circular dep at module init
    for (const id of ids) {
      const tasting = await db.tastings.get(id)
      if (tasting) {
        try {
          await pushTasting(tasting)
        } catch (err) {
          console.error(`Sync failed for ${id}:`, err)
          failedIds.push(id)
        }
      }
    }
    if (failedIds.length > 0) {
      // Re-add failed IDs so they'll be retried on next flush
      for (const id of failedIds) pendingIds.add(id)
    }
    if (failedIds.length < ids.length) {
      setLastSyncAt(new Date().toISOString())
    }
    setStatus(failedIds.length > 0 ? 'error' : 'success')
    // Reset to idle after 3s
    if (failedIds.length === 0) {
      setTimeout(() => { if (currentStatus === 'success') setStatus('idle') }, 3000)
    }
  } catch (err) {
    console.error('Sync failed:', err)
    // Re-add all IDs on catastrophic failure
    for (const id of ids) pendingIds.add(id)
    setStatus('error')
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (pendingIds.size > 0) {
      // Use sendBeacon as fallback — can't await in beforeunload
      // Just mark that sync was interrupted; next load will catch up
      flushPending().catch(() => {})
    }
  })
}
