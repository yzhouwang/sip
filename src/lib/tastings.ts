/**
 * Tasting service layer — all mutations go through here.
 * Centralizes sync triggers so components never call db.tastings directly for writes.
 */
import { db } from './db'
import type { Tasting, DrinkType, FlavorId } from './db'
import { schedulePush, deleteTastingFromServer, pullAll, downloadPhoto, shouldPull, fromDTO, pushTasting } from './sync'
import { isSyncConfigured, setLastSyncAt } from './config'

export interface TastingInput {
  drinkType: DrinkType
  name: string
  rating: number
  flavors: FlavorId[]
  notes: string
  location: string
  photo?: Blob
  photoThumb?: Blob
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
  if (input.photo !== undefined) {
    fields.photo = input.photo
    fields.photoThumb = input.photoThumb
    fields.hasPhoto = true
  }

  await db.tastings.update(id, fields)
  schedulePush(id)
}

/** Delete a tasting */
export async function deleteTasting(id: string): Promise<void> {
  await db.tastings.delete(id)

  // Fire-and-forget server delete
  if (isSyncConfigured()) {
    deleteTastingFromServer(id).catch((err) => {
      console.error('Server delete failed:', err)
    })
  }
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

/** Push all local tastings to server */
export async function pushAllToServer(
  onProgress?: (done: number, total: number) => void,
): Promise<{ pushed: number; errors: number }> {
  const all = await db.tastings.toArray()
  let pushed = 0
  let errors = 0

  for (let i = 0; i < all.length; i++) {
    try {
      await pushTasting(all[i])
      pushed++
    } catch (err) {
      console.error(`Push failed for ${all[i].id}:`, err)
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
): Promise<{ added: number; updated: number; errors: number }> {
  const dtos = await pullAll()
  let added = 0
  let updated = 0
  let errors = 0

  for (let i = 0; i < dtos.length; i++) {
    const dto = dtos[i]
    try {
      const local = await db.tastings.get(dto.id)

      if (local && !shouldPull(local, dto)) {
        // Local is same or newer, skip
        onProgress?.(i + 1, dtos.length)
        continue
      }

      // Download photos if available
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

  if (added + updated > 0) setLastSyncAt(new Date().toISOString())
  return { added, updated, errors }
}
