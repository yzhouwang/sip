import Dexie, { type EntityTable } from 'dexie'

export type DrinkType = 'wine' | 'whisky' | 'beer' | 'sake' | 'cocktail' | 'other'

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
  flavors: FlavorId[]
  notes: string
  location: string
  createdAt: Date
  updatedAt: Date
}

const db = new Dexie('SipDB') as Dexie & {
  tastings: EntityTable<Tasting, 'id'>
}

db.version(1).stores({
  tastings: 'id, drinkType, name, rating, createdAt',
})

export { db }
