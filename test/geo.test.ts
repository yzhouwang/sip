import { describe, it, expect, vi } from 'vitest'
import { db } from '../src/lib/db'
import { createTasting, updateTasting } from '../src/lib/tastings'
import { toDTO, fromDTO } from '../src/lib/sync'
import type { Tasting, TastingDTO } from '../src/lib/db'

vi.mock('../src/lib/sync', async () => {
  const actual = await vi.importActual('../src/lib/sync')
  return {
    ...actual,
    schedulePush: vi.fn(),
    deleteTastingFromServer: vi.fn().mockResolvedValue(undefined),
    pullAll: vi.fn().mockResolvedValue([]),
    downloadPhoto: vi.fn(),
  }
})

vi.mock('../src/lib/config', () => ({
  isSyncConfigured: () => false,
  setLastSyncAt: vi.fn(),
}))

describe('geo (latitude/longitude)', () => {
  it('createTasting with latitude/longitude saves correctly', async () => {
    const id = await createTasting({
      drinkType: 'sake',
      name: 'Tokyo Sake',
      rating: 5,
      flavors: ['crisp'],
      notes: '',
      location: 'Tokyo',
      latitude: 35.6762,
      longitude: 139.6503,
    })

    const stored = await db.tastings.get(id)
    expect(stored!.latitude).toBe(35.6762)
    expect(stored!.longitude).toBe(139.6503)
  })

  it('createTasting without coordinates (undefined)', async () => {
    const id = await createTasting({
      drinkType: 'wine',
      name: 'No Coords',
      rating: 3,
      flavors: [],
      notes: '',
      location: '',
    })

    const stored = await db.tastings.get(id)
    expect(stored!.latitude).toBeUndefined()
    expect(stored!.longitude).toBeUndefined()
  })

  it('updateTasting can set coordinates', async () => {
    const id = await createTasting({
      drinkType: 'beer',
      name: 'Local Brew',
      rating: 4,
      flavors: [],
      notes: '',
      location: '',
    })

    await updateTasting(id, { latitude: 37.7749, longitude: -122.4194 })

    const stored = await db.tastings.get(id)
    expect(stored!.latitude).toBe(37.7749)
    expect(stored!.longitude).toBe(-122.4194)
  })

  it('toDTO includes lat/lng fields', () => {
    const tasting: Tasting = {
      id: 'geo-dto',
      drinkType: 'whisky',
      name: 'Highland',
      rating: 4,
      hasPhoto: false,
      flavors: [],
      notes: '',
      location: 'Scotland',
      status: 'tasted',
      latitude: 56.4907,
      longitude: -4.2026,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    }

    const dto = toDTO(tasting)
    expect(dto.latitude).toBe(56.4907)
    expect(dto.longitude).toBe(-4.2026)
  })

  it('fromDTO includes lat/lng fields', () => {
    const dto: TastingDTO = {
      id: 'geo-from',
      drinkType: 'sake',
      name: 'Kyoto Sake',
      rating: 5,
      hasPhoto: false,
      flavors: [],
      notes: '',
      location: 'Kyoto',
      status: 'tasted',
      latitude: 35.0116,
      longitude: 135.7681,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const tasting = fromDTO(dto)
    expect(tasting.latitude).toBe(35.0116)
    expect(tasting.longitude).toBe(135.7681)
  })
})
