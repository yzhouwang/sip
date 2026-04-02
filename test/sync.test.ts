import { describe, it, expect, beforeEach, vi } from 'vitest'
import { toDTO, fromDTO, shouldPull, parseISODate } from '../src/lib/sync'
import type { Tasting, TastingDTO } from '../src/lib/db'

function makeTasting(overrides?: Partial<Tasting>): Tasting {
  return {
    id: 'test-id-1',
    drinkType: 'whisky',
    name: 'Test Whisky',
    rating: 4,
    hasPhoto: false,
    flavors: ['smoky', 'rich'],
    notes: 'Great stuff',
    location: 'Bar',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    updatedAt: new Date('2026-01-15T12:00:00Z'),
    ...overrides,
  }
}

function makeDTO(overrides?: Partial<TastingDTO>): TastingDTO {
  return {
    id: 'test-id-1',
    drinkType: 'whisky',
    name: 'Test Whisky',
    rating: 4,
    hasPhoto: false,
    flavors: ['smoky', 'rich'],
    notes: 'Great stuff',
    location: 'Bar',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T12:00:00.000Z',
    ...overrides,
  }
}

describe('toDTO', () => {
  it('converts Tasting to DTO with ISO dates', () => {
    const t = makeTasting()
    const dto = toDTO(t)
    expect(dto.id).toBe('test-id-1')
    expect(dto.createdAt).toBe('2026-01-15T10:00:00.000Z')
    expect(dto.updatedAt).toBe('2026-01-15T12:00:00.000Z')
    expect(dto.flavors).toEqual(['smoky', 'rich'])
    expect(dto.hasPhoto).toBe(false)
    // No photo/thumb URLs in base DTO
    expect('photoUrl' in dto).toBe(false)
    expect('thumbUrl' in dto).toBe(false)
  })

  it('handles missing optional fields', () => {
    const t = makeTasting({ notes: '', location: '' })
    const dto = toDTO(t)
    expect(dto.notes).toBe('')
    expect(dto.location).toBe('')
  })
})

describe('fromDTO', () => {
  it('converts DTO to Tasting with Date objects', () => {
    const dto = makeDTO()
    const t = fromDTO(dto)
    expect(t.id).toBe('test-id-1')
    expect(t.createdAt).toBeInstanceOf(Date)
    expect(t.updatedAt).toBeInstanceOf(Date)
    expect(t.createdAt.toISOString()).toBe('2026-01-15T10:00:00.000Z')
  })

  it('copies flavors as a new array', () => {
    const dto = makeDTO()
    const t = fromDTO(dto)
    dto.flavors.push('sweet')
    expect(t.flavors).toEqual(['smoky', 'rich'])  // not mutated
  })
})

describe('parseISODate', () => {
  it('parses valid ISO string', () => {
    const d = parseISODate('2026-01-15T10:00:00.000Z')
    expect(d).toBeInstanceOf(Date)
    expect(d!.toISOString()).toBe('2026-01-15T10:00:00.000Z')
  })

  it('returns null for invalid string', () => {
    expect(parseISODate('not-a-date')).toBeNull()
    expect(parseISODate('')).toBeNull()
  })
})

describe('shouldPull', () => {
  it('returns true when server is newer', () => {
    const local = { updatedAt: new Date('2026-01-15T10:00:00Z') }
    const server = { updatedAt: '2026-01-15T12:00:00.000Z' }
    expect(shouldPull(local, server)).toBe(true)
  })

  it('returns false when local is newer', () => {
    const local = { updatedAt: new Date('2026-01-15T14:00:00Z') }
    const server = { updatedAt: '2026-01-15T12:00:00.000Z' }
    expect(shouldPull(local, server)).toBe(false)
  })

  it('returns false when same time', () => {
    const local = { updatedAt: new Date('2026-01-15T12:00:00Z') }
    const server = { updatedAt: '2026-01-15T12:00:00.000Z' }
    expect(shouldPull(local, server)).toBe(false)
  })

  it('returns false for invalid server date', () => {
    const local = { updatedAt: new Date('2026-01-15T10:00:00Z') }
    expect(shouldPull(local, { updatedAt: 'garbage' })).toBe(false)
  })
})
