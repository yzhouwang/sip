import { describe, it, expect } from 'vitest'
import { DRINK_TYPES } from '../src/lib/db'

// Re-create validation logic for testing (matches Settings.tsx)
const VALID_FLAVORS = new Set([
  'smoky', 'earthy', 'briny', 'sweet', 'floral', 'citrus', 'spicy',
  'fruity', 'rich', 'bitter', 'umami', 'herbal', 'nutty', 'oaky', 'crisp',
])

function validateTasting(t: unknown): string | null {
  if (!t || typeof t !== 'object') return 'Invalid tasting object'
  const obj = t as Record<string, unknown>
  if (typeof obj.id !== 'string' || !obj.id) return 'Missing or invalid id'
  if (typeof obj.name !== 'string' || !obj.name) return 'Missing or invalid name'
  if (typeof obj.rating !== 'number' || obj.rating < 1 || obj.rating > 5 || !Number.isInteger(obj.rating)) return 'Rating must be integer 1-5'
  if (typeof obj.drinkType !== 'string' || !DRINK_TYPES.includes(obj.drinkType as any)) return 'Invalid drinkType'
  if (!Array.isArray(obj.flavors) || obj.flavors.length > 5 || !obj.flavors.every((f: unknown) => typeof f === 'string' && VALID_FLAVORS.has(f))) return 'Invalid flavors'
  if (typeof obj.notes !== 'string') return 'Invalid notes'
  if (typeof obj.location !== 'string') return 'Invalid location'
  if (typeof obj.createdAt !== 'string' || isNaN(Date.parse(obj.createdAt))) return 'Invalid createdAt'
  if (typeof obj.updatedAt !== 'string' || isNaN(Date.parse(obj.updatedAt))) return 'Invalid updatedAt'
  return null
}

function base64ToBlob(dataUrl: string): Blob | undefined {
  try {
    if (typeof dataUrl !== 'string' || !dataUrl.includes(',')) return undefined
    const [meta, b64] = dataUrl.split(',')
    if (!b64) return undefined
    const mime = meta.match(/:(.*?);/)?.[1] || 'image/jpeg'
    const bytes = atob(b64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return new Blob([arr], { type: mime })
  } catch {
    return undefined
  }
}

const validTasting = {
  id: 'abc-123',
  drinkType: 'whisky',
  name: 'Test',
  rating: 4,
  flavors: ['smoky'],
  notes: 'Good',
  location: 'Bar',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('import validation', () => {
  it('accepts valid tasting', () => {
    expect(validateTasting(validTasting)).toBeNull()
  })

  it('rejects null', () => {
    expect(validateTasting(null)).toBe('Invalid tasting object')
  })

  it('rejects missing id', () => {
    expect(validateTasting({ ...validTasting, id: '' })).toBe('Missing or invalid id')
  })

  it('rejects missing name', () => {
    expect(validateTasting({ ...validTasting, name: '' })).toBe('Missing or invalid name')
  })

  it('rejects rating outside 1-5', () => {
    expect(validateTasting({ ...validTasting, rating: 0 })).toBe('Rating must be integer 1-5')
    expect(validateTasting({ ...validTasting, rating: 6 })).toBe('Rating must be integer 1-5')
    expect(validateTasting({ ...validTasting, rating: 3.5 })).toBe('Rating must be integer 1-5')
  })

  it('rejects invalid drinkType', () => {
    expect(validateTasting({ ...validTasting, drinkType: 'tequila' })).toBe('Invalid drinkType')
  })

  it('rejects invalid flavors', () => {
    expect(validateTasting({ ...validTasting, flavors: ['fake'] })).toBe('Invalid flavors')
  })

  it('rejects more than 5 flavors', () => {
    expect(validateTasting({
      ...validTasting,
      flavors: ['smoky', 'earthy', 'sweet', 'floral', 'citrus', 'spicy'],
    })).toBe('Invalid flavors')
  })

  it('rejects invalid dates', () => {
    expect(validateTasting({ ...validTasting, createdAt: 'garbage' })).toBe('Invalid createdAt')
    expect(validateTasting({ ...validTasting, updatedAt: 'garbage' })).toBe('Invalid updatedAt')
  })

  it('rejects non-string notes', () => {
    expect(validateTasting({ ...validTasting, notes: 42 })).toBe('Invalid notes')
  })
})

describe('base64ToBlob', () => {
  it('converts valid data URL to Blob', () => {
    const dataUrl = 'data:image/jpeg;base64,/9j/4AAQ'
    const blob = base64ToBlob(dataUrl)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob!.type).toBe('image/jpeg')
  })

  it('returns undefined for malformed input', () => {
    expect(base64ToBlob('not-a-data-url')).toBeUndefined()
    expect(base64ToBlob('')).toBeUndefined()
  })

  it('returns undefined for undefined-like input', () => {
    expect(base64ToBlob(undefined as any)).toBeUndefined()
    expect(base64ToBlob(null as any)).toBeUndefined()
  })

  it('returns undefined for data URL with no base64 part', () => {
    expect(base64ToBlob('data:image/jpeg;base64,')).toBeUndefined()
  })
})
