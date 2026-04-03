/** Shared constants between client and server — single source of truth */

export const VALID_DRINK_TYPES = [
  'wine', 'whisky', 'beer', 'sake', 'cocktail', 'other',
] as const

export const VALID_FLAVORS = [
  'smoky', 'earthy', 'briny', 'sweet', 'floral', 'citrus', 'spicy',
  'fruity', 'rich', 'bitter', 'umami', 'herbal', 'nutty', 'oaky', 'crisp',
] as const

export const VALID_STATUSES = ['tasted', 'wishlist', 'cellar'] as const

export const MAX_NAME_LENGTH = 500
export const MAX_NOTES_LENGTH = 10000
export const MAX_FLAVORS_PER_TASTING = 5
export const MIN_RATING = 1
export const MAX_RATING = 5
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const TOMBSTONE_RETENTION_DAYS = 30
export const SYNC_DEBOUNCE_MS = 1000
export const DATA_TIMEOUT_MS = 30_000
export const PHOTO_TIMEOUT_MS = 60_000
