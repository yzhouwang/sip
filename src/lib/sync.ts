import type { Tasting, TastingDTO } from './db'
import { getServerUrl, getApiKey, isSyncConfigured, setLastSyncAt } from './config'

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
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  }
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
): Promise<void> {
  if (!isSyncConfigured()) return

  const url = `${baseUrl()}/api/tastings/${tasting.id}`
  const dto = toDTO(tasting)

  const res = await fetchFn(url, {
    method: 'PUT',
    headers: makeHeaders(),
    body: JSON.stringify(dto),
  })

  if (res.status === 401) throw new SyncError('Authentication failed', 401)
  if (!res.ok) throw new SyncError(`Push failed: ${res.status}`, res.status)

  // Upload photo if exists (separate request)
  if (tasting.photo && tasting.hasPhoto) {
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
  const res = await fetchFn(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}` },
    body: form,
  })

  if (!res.ok) throw new SyncError(`Photo upload failed: ${res.status}`, res.status)
}

/** Delete a tasting from the server */
export async function deleteTastingFromServer(
  id: string,
  fetchFn: FetchFn = fetch,
): Promise<void> {
  if (!isSyncConfigured()) return

  const url = `${baseUrl()}/api/tastings/${id}`
  const res = await fetchFn(url, {
    method: 'DELETE',
    headers: makeHeaders(),
  })

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
  const res = await fetchFn(url, {
    method: 'GET',
    headers: makeHeaders(),
  })

  if (res.status === 401) throw new SyncError('Authentication failed', 401)
  if (!res.ok) throw new SyncError(`Pull failed: ${res.status}`, res.status)

  const data = await res.json()
  return data.tastings as TastingDTO[]
}

/** Download a photo by URL and return as Blob */
export async function downloadPhoto(
  photoPath: string,
  fetchFn: FetchFn = fetch,
): Promise<Blob> {
  const url = `${baseUrl()}${photoPath}`
  const key = getApiKey()
  const res = await fetchFn(url, {
    headers: { 'Authorization': `Bearer ${key}` },
  })

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
    const res = await fetchFn(url, {
      method: 'GET',
      headers: makeHeaders(),
    })

    if (res.status === 401) return { ok: false, error: 'Invalid API key' }
    if (!res.ok) return { ok: false, error: `Server error: ${res.status}` }
    return { ok: true }
  } catch (err) {
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
  try {
    const { db } = await import('./db')  // lazy to break circular dep at module init
    for (const id of ids) {
      const tasting = await db.tastings.get(id)
      if (tasting) {
        await pushTasting(tasting)
      }
    }
    setLastSyncAt(new Date().toISOString())
    setStatus('success')
    // Reset to idle after 3s
    setTimeout(() => { if (currentStatus === 'success') setStatus('idle') }, 3000)
  } catch (err) {
    console.error('Sync failed:', err)
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
