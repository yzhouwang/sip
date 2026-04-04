/**
 * Tasting service layer — all mutations go through here.
 * Centralizes sync triggers so components never call db.tastings directly for writes.
 */
import { db } from './db'
import type { Tasting, TastingDTO, DrinkType, FlavorId, TastingStatus } from './db'
import { schedulePush, pushTasting, pullAll, downloadPhoto, shouldPull, hasConflict, fromDTO } from './sync'
import { isSyncConfigured, setLastSyncAt } from './config'

export interface TastingInput {
  drinkType: DrinkType
  name: string
  rating: number
  flavors: FlavorId[]
  notes: string
  location: string
  status?: TastingStatus
  latitude?: number
  longitude?: number
  photo?: Blob
  photoThumb?: Blob
}

export interface ConflictItem {
  local: Tasting
  server: TastingDTO
}

/** Create a new tasting */
export async function createTasting(input: TastingInput): Promise<string> {
  const id = crypto.randomUUID()
  const now = new Date()

  await db.tastings.add({
    id,
    drinkType: input.drinkType,
    name: input.name.trim(),
    rating: input.rating,
    photo: input.photo,
    photoThumb: input.photoThumb,
    hasPhoto: !!input.photo,
    flavors: input.flavors,
    notes: input.notes.trim(),
    location: input.location.trim(),
    status: input.status || 'tasted',
    latitude: input.latitude,
    longitude: input.longitude,
    createdAt: now,
    updatedAt: now,
  })

  schedulePush(id)
  return id
}

/** Update an existing tasting */
export async function updateTasting(
  id: string,
  input: Partial<TastingInput>,
): Promise<void> {
  const now = new Date()
  const fields: Partial<Tasting> = { updatedAt: now }

  if (input.drinkType !== undefined) fields.drinkType = input.drinkType
  if (input.name !== undefined) fields.name = input.name.trim()
  if (input.rating !== undefined) fields.rating = input.rating
  if (input.flavors !== undefined) fields.flavors = input.flavors
  if (input.notes !== undefined) fields.notes = input.notes.trim()
  if (input.location !== undefined) fields.location = input.location.trim()
  if (input.status !== undefined) fields.status = input.status
  if (input.latitude !== undefined) fields.latitude = input.latitude
  if (input.longitude !== undefined) fields.longitude = input.longitude
  if (input.photo !== undefined) {
    fields.photo = input.photo
    fields.photoThumb = input.photoThumb
    fields.hasPhoto = true
    fields.photoSyncedAt = undefined // Mark photo as needing re-sync
  }

  await db.tastings.update(id, fields)
  schedulePush(id)
}

/** Soft-delete a tasting (tombstone) */
export async function deleteTasting(id: string): Promise<void> {
  const now = new Date()
  await db.tastings.update(id, {
    deletedAt: now,
    updatedAt: now,
  })

  // Push tombstone to server
  schedulePush(id)
}

/** Import tastings from backup (batch operation) */
export async function importTastings(
  tastings: Tasting[],
): Promise<{ imported: number; skipped: number }> {
  let imported = 0
  let skipped = 0

  await db.transaction('rw', db.tastings, async () => {
    for (const tasting of tastings) {
      const existing = await db.tastings.get(tasting.id)
      if (existing) {
        skipped++
      } else {
        // Ensure new fields have defaults
        if (!tasting.status) tasting.status = 'tasted'
        await db.tastings.add(tasting)
        imported++
      }
    }
  })

  // Schedule sync for all imported tastings (debounce handles batching)
  if (isSyncConfigured()) {
    for (const t of tastings) {
      schedulePush(t.id)
    }
  }

  return { imported, skipped }
}

/** Push all local tastings to server (with incremental photo sync) */
export async function pushAllToServer(
  onProgress?: (done: number, total: number) => void,
): Promise<{ pushed: number; errors: number }> {
  const all = await db.tastings.toArray()
  // Include tombstoned records so server gets the delete
  let pushed = 0
  let errors = 0

  for (let i = 0; i < all.length; i++) {
    const tasting = all[i]
    try {
      // Check if photo needs syncing (incremental photo sync)
      const skipPhoto = tasting.photoSyncedAt &&
        tasting.photoSyncedAt >= tasting.updatedAt

      await pushTasting(tasting, undefined, skipPhoto)

      // Update sync tracking
      const now = new Date()
      const updates: Partial<Tasting> = { lastSyncedAt: now }
      if (tasting.hasPhoto && tasting.photo && !skipPhoto) {
        updates.photoSyncedAt = now
      }
      await db.tastings.update(tasting.id, updates)

      pushed++
    } catch (err) {
      console.error(`Push failed for ${tasting.id}:`, err)
      errors++
    }
    onProgress?.(i + 1, all.length)
  }

  if (pushed > 0) setLastSyncAt(new Date().toISOString())
  return { pushed, errors }
}

/** Pull all tastings from server, merge into local DB */
export async function pullFromServer(
  onProgress?: (done: number, total: number) => void,
): Promise<{ added: number; updated: number; tombstoned: number; conflicts: ConflictItem[]; errors: number }> {
  const dtos = await pullAll()
  let added = 0
  let updated = 0
  let tombstoned = 0
  let errors = 0
  const conflicts: ConflictItem[] = []

  for (let i = 0; i < dtos.length; i++) {
    const dto = dtos[i]
    try {
      const local = await db.tastings.get(dto.id)

      // Handle tombstone from server
      if (dto.deletedAt) {
        if (local && !local.deletedAt) {
          // Server says deleted, local exists. Check for conflict.
          if (local.updatedAt.getTime() > (local.lastSyncedAt?.getTime() ?? 0)) {
            // Local was modified since last sync, this is a tombstone conflict
            conflicts.push({ local, server: dto })
          } else {
            // Local unchanged, apply server tombstone
            await db.tastings.update(dto.id, {
              deletedAt: new Date(dto.deletedAt),
              updatedAt: new Date(dto.updatedAt),
              lastSyncedAt: new Date(),
            })
            tombstoned++
          }
        }
        onProgress?.(i + 1, dtos.length)
        continue
      }

      // Skip if local is tombstoned and server isn't (we'll push our tombstone)
      if (local?.deletedAt && !dto.deletedAt) {
        onProgress?.(i + 1, dtos.length)
        continue
      }

      if (local && !shouldPull(local, dto)) {
        // Local is same or newer, skip
        onProgress?.(i + 1, dtos.length)
        continue
      }

      // Check for conflict (both sides changed)
      if (local && hasConflict(local, dto)) {
        conflicts.push({ local, server: dto })
        onProgress?.(i + 1, dtos.length)
        continue
      }

      // Download photos if available (batched, 5 concurrent)
      let photo: Blob | undefined
      let thumb: Blob | undefined

      if (dto.photoUrl) {
        try {
          photo = await downloadPhoto(dto.photoUrl)
        } catch {
          console.warn(`Photo download failed for ${dto.id}`)
        }
      }
      if (dto.thumbUrl) {
        try {
          thumb = await downloadPhoto(dto.thumbUrl)
        } catch {
          console.warn(`Thumb download failed for ${dto.id}`)
        }
      }

      const tasting: Tasting = {
        ...fromDTO(dto),
        photo,
        photoThumb: thumb,
        lastSyncedAt: new Date(),
      }

      if (local) {
        await db.tastings.put(tasting)
        updated++
      } else {
        await db.tastings.add(tasting)
        added++
      }
    } catch (err) {
      console.error(`Pull failed for ${dto.id}:`, err)
      errors++
    }
    onProgress?.(i + 1, dtos.length)
  }

  if (added + updated + tombstoned > 0) setLastSyncAt(new Date().toISOString())
  return { added, updated, tombstoned, conflicts, errors }
}

/** Resolve a conflict by keeping one side */
export async function resolveConflict(
  item: ConflictItem,
  keep: 'local' | 'server',
): Promise<void> {
  if (keep === 'local') {
    // Keep local, mark as synced so it pushes on next sync
    await db.tastings.update(item.local.id, {
      lastSyncedAt: undefined, // Force re-push
    })
    schedulePush(item.local.id)
  } else {
    // Keep server version
    let photo: Blob | undefined
    let thumb: Blob | undefined

    if (item.server.photoUrl) {
      try { photo = await downloadPhoto(item.server.photoUrl) } catch { /* skip */ }
    }
    if (item.server.thumbUrl) {
      try { thumb = await downloadPhoto(item.server.thumbUrl) } catch { /* skip */ }
    }

    const tasting: Tasting = {
      ...fromDTO(item.server),
      photo,
      photoThumb: thumb,
      lastSyncedAt: new Date(),
    }
    await db.tastings.put(tasting)
  }
}
