import Dexie, { type EntityTable } from 'dexie'

export type DrinkType = 'wine' | 'whisky' | 'beer' | 'sake' | 'cocktail' | 'other'
export type TastingStatus = 'tasted' | 'wishlist' | 'cellar'

export const DRINK_TYPES: DrinkType[] = ['wine', 'whisky', 'beer', 'sake', 'cocktail', 'other']

export const DRINK_LABELS: Record<DrinkType, string> = {
  wine: 'Wine',
  whisky: 'Whisky',
  beer: 'Beer',
  sake: 'Sake',
  cocktail: 'Cocktail',
  other: 'Other',
}

export const DRINK_EMOJI: Record<DrinkType, string> = {
  wine: '🍷',
  whisky: '🥃',
  beer: '🍺',
  sake: '🍶',
  cocktail: '🍸',
  other: '🍹',
}

export const FLAVORS = [
  { id: 'smoky', emoji: '🔥', label: 'Smoky' },
  { id: 'earthy', emoji: '🌿', label: 'Earthy' },
  { id: 'briny', emoji: '🌊', label: 'Briny' },
  { id: 'sweet', emoji: '🍯', label: 'Sweet' },
  { id: 'floral', emoji: '🌸', label: 'Floral' },
  { id: 'citrus', emoji: '🍊', label: 'Citrus' },
  { id: 'spicy', emoji: '🌶', label: 'Spicy' },
  { id: 'fruity', emoji: '🫐', label: 'Fruity' },
  { id: 'rich', emoji: '🍫', label: 'Rich' },
  { id: 'bitter', emoji: '🍺', label: 'Bitter' },
  { id: 'umami', emoji: '🍄', label: 'Umami' },
  { id: 'herbal', emoji: '🌱', label: 'Herbal' },
  { id: 'nutty', emoji: '🥜', label: 'Nutty' },
  { id: 'oaky', emoji: '🪵', label: 'Oaky' },
  { id: 'crisp', emoji: '❄️', label: 'Crisp' },
] as const

export type FlavorId = (typeof FLAVORS)[number]['id']

export interface Tasting {
  id: string
  drinkType: DrinkType
  name: string
  rating: number // 1-5
  photo?: Blob
  photoThumb?: Blob
  hasPhoto: boolean // survives Safari Blob eviction
  flavors: FlavorId[]
  notes: string
  location: string
  status: TastingStatus
  latitude?: number
  longitude?: number
  deletedAt?: Date
  lastSyncedAt?: Date
  photoSyncedAt?: Date
  createdAt: Date
  updatedAt: Date
}

/** DTO shape for server sync — URLs instead of Blobs, ISO strings instead of Dates */
export interface TastingDTO {
  id: string
  drinkType: DrinkType
  name: string
  rating: number
  hasPhoto: boolean
  photoUrl?: string
  thumbUrl?: string
  flavors: FlavorId[]
  notes: string
  location: string
  status: TastingStatus
  latitude?: number
  longitude?: number
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

const db = new Dexie('SipDB') as Dexie & {
  tastings: EntityTable<Tasting, 'id'>
}

db.version(1).stores({
  tastings: 'id, drinkType, name, rating, createdAt',
})

// v2: add updatedAt index for sync, hasPhoto for eviction guard
db.version(2).stores({
  tastings: 'id, drinkType, name, rating, createdAt, updatedAt',
}).upgrade((tx) => {
  return tx.table('tastings').toCollection().modify((tasting) => {
    // Backfill hasPhoto for existing records
    if (tasting.hasPhoto === undefined) {
      tasting.hasPhoto = !!(tasting.photo || tasting.photoThumb)
    }
  })
})

// v3: Phase 2 fields — status, coordinates, tombstone, sync tracking
db.version(3).stores({
  tastings: 'id, drinkType, name, rating, createdAt, updatedAt, status, deletedAt',
}).upgrade((tx) => {
  return tx.table('tastings').toCollection().modify((tasting) => {
    if (tasting.status === undefined) tasting.status = 'tasted'
    if (tasting.lastSyncedAt === undefined) tasting.lastSyncedAt = tasting.updatedAt
  })
})

/** Purge tombstones older than N days */
export async function purgeTombstones(retentionDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
  const toDelete = await db.tastings
    .where('deletedAt')
    .below(cutoff)
    .toArray()
  const tombstoned = toDelete.filter((t) => t.deletedAt)
  if (tombstoned.length === 0) return 0
  await db.tastings.bulkDelete(tombstoned.map((t) => t.id))
  return tombstoned.length
}

export { db }
