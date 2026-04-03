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

describe('tasting status', () => {
  it('createTasting defaults status to tasted', async () => {
    const id = await createTasting({
      drinkType: 'wine',
      name: 'Default Status',
      rating: 3,
      flavors: [],
      notes: '',
      location: '',
    })

    const stored = await db.tastings.get(id)
    expect(stored!.status).toBe('tasted')
  })

  it('createTasting with explicit status=wishlist', async () => {
    const id = await createTasting({
      drinkType: 'whisky',
      name: 'Want This',
      rating: 4,
      flavors: [],
      notes: '',
      location: '',
      status: 'wishlist',
    })

    const stored = await db.tastings.get(id)
    expect(stored!.status).toBe('wishlist')
  })

  it('createTasting with status=cellar', async () => {
    const id = await createTasting({
      drinkType: 'wine',
      name: 'Aging',
      rating: 5,
      flavors: [],
      notes: '',
      location: '',
      status: 'cellar',
    })

    const stored = await db.tastings.get(id)
    expect(stored!.status).toBe('cellar')
  })

  it('updateTasting can change status', async () => {
    const id = await createTasting({
      drinkType: 'sake',
      name: 'Status Change',
      rating: 4,
      flavors: [],
      notes: '',
      location: '',
      status: 'wishlist',
    })

    await updateTasting(id, { status: 'tasted' })

    const stored = await db.tastings.get(id)
    expect(stored!.status).toBe('tasted')
  })

  it('toDTO includes status field', () => {
    const tasting: Tasting = {
      id: 'status-test',
      drinkType: 'beer',
      name: 'IPA',
      rating: 4,
      hasPhoto: false,
      flavors: [],
      notes: '',
      location: '',
      status: 'cellar',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    }

    const dto = toDTO(tasting)
    expect(dto.status).toBe('cellar')
  })

  it('fromDTO includes status field', () => {
    const dto: TastingDTO = {
      id: 'dto-status',
      drinkType: 'cocktail',
      name: 'Martini',
      rating: 5,
      hasPhoto: false,
      flavors: [],
      notes: '',
      location: '',
      status: 'wishlist',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    const tasting = fromDTO(dto)
    expect(tasting.status).toBe('wishlist')
  })

  it('fromDTO defaults status to tasted when missing', () => {
    const dto = {
      id: 'no-status',
      drinkType: 'wine' as const,
      name: 'Old Record',
      rating: 3,
      hasPhoto: false,
      flavors: [],
      notes: '',
      location: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } as TastingDTO

    const tasting = fromDTO(dto)
    expect(tasting.status).toBe('tasted')
  })
})
