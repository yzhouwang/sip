import { describe, it, expect } from 'vitest'
import {
  VALID_DRINK_TYPES,
  VALID_FLAVORS,
  VALID_STATUSES,
  MAX_NAME_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_FLAVORS_PER_TASTING,
  MIN_RATING,
  MAX_RATING,
  TOMBSTONE_RETENTION_DAYS,
} from '../shared/constants'

describe('shared constants', () => {
  it('VALID_DRINK_TYPES contains expected values', () => {
    expect(VALID_DRINK_TYPES).toContain('wine')
    expect(VALID_DRINK_TYPES).toContain('whisky')
    expect(VALID_DRINK_TYPES).toContain('beer')
    expect(VALID_DRINK_TYPES).toContain('sake')
    expect(VALID_DRINK_TYPES).toContain('cocktail')
    expect(VALID_DRINK_TYPES).toContain('other')
  })

  it('VALID_FLAVORS contains expected values', () => {
    expect(VALID_FLAVORS).toContain('smoky')
    expect(VALID_FLAVORS).toContain('earthy')
    expect(VALID_FLAVORS).toContain('briny')
    expect(VALID_FLAVORS).toContain('sweet')
    expect(VALID_FLAVORS).toContain('floral')
    expect(VALID_FLAVORS).toContain('citrus')
    expect(VALID_FLAVORS).toContain('spicy')
    expect(VALID_FLAVORS).toContain('fruity')
    expect(VALID_FLAVORS).toContain('rich')
    expect(VALID_FLAVORS).toContain('bitter')
    expect(VALID_FLAVORS).toContain('umami')
    expect(VALID_FLAVORS).toContain('herbal')
    expect(VALID_FLAVORS).toContain('nutty')
    expect(VALID_FLAVORS).toContain('oaky')
    expect(VALID_FLAVORS).toContain('crisp')
  })

  it('VALID_STATUSES contains expected values', () => {
    expect(VALID_STATUSES).toContain('tasted')
    expect(VALID_STATUSES).toContain('wishlist')
    expect(VALID_STATUSES).toContain('cellar')
  })

  it('has 6 drink types', () => {
    expect(VALID_DRINK_TYPES).toHaveLength(6)
  })

  it('has 15 flavors', () => {
    expect(VALID_FLAVORS).toHaveLength(15)
  })

  it('has 3 statuses', () => {
    expect(VALID_STATUSES).toHaveLength(3)
  })

  it('rating range is 1-5', () => {
    expect(MIN_RATING).toBe(1)
    expect(MAX_RATING).toBe(5)
  })

  it('max flavors per tasting is 5', () => {
    expect(MAX_FLAVORS_PER_TASTING).toBe(5)
  })

  it('tombstone retention is 30 days', () => {
    expect(TOMBSTONE_RETENTION_DAYS).toBe(30)
  })

  it('name and notes have reasonable limits', () => {
    expect(MAX_NAME_LENGTH).toBe(500)
    expect(MAX_NOTES_LENGTH).toBe(10000)
  })
})
