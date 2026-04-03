import { describe, it, expect, vi } from 'vitest'
import { db, purgeTombstones } from '../src/lib/db'
import { createTasting, deleteTasting } from '../src/lib/tastings'
import { toDTO } from '../src/lib/sync'
import type { Tasting } from '../src/lib/db'

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

describe('tombstone (soft delete)', () => {
  it('soft delete sets deletedAt (does not remove record)', async () => {
    const id = await createTasting({
      drinkType: 'wine',
      name: 'Delete Me',
      rating: 3,
      flavors: [],
      notes: '',
      location: '',
    })

    await deleteTasting(id)

    const record = await db.tastings.get(id)
    expect(record).toBeDefined()
    expect(record!.deletedAt).toBeInstanceOf(Date)
  })

  it('soft-deleted records still exist in DB', async () => {
    const id = await createTasting({
      drinkType: 'beer',
      name: 'Still Here',
      rating: 2,
      flavors: [],
      notes: '',
      location: '',
    })

    await deleteTasting(id)

    const all = await db.tastings.toArray()
    expect(all.some((t) => t.id === id)).toBe(true)
  })

  it('purgeTombstones removes records older than 30 days', async () => {
    const id = crypto.randomUUID()
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)

    await db.tastings.add({
      id,
      drinkType: 'whisky',
      name: 'Old Tombstone',
      rating: 4,
      hasPhoto: false,
      flavors: [],
      notes: '',
      location: '',
      status: 'tasted',
      deletedAt: oldDate,
      createdAt: oldDate,
      updatedAt: oldDate,
    })

    const purged = await purgeTombstones()
    expect(purged).toBe(1)
    expect(await db.tastings.get(id)).toBeUndefined()
  })

  it('purgeTombstones does NOT remove recent tombstones', async () => {
    const id = crypto.randomUUID()
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago

    await db.tastings.add({
      id,
      drinkType: 'sake',
      name: 'Recent Tombstone',
      rating: 3,
      hasPhoto: false,
      flavors: [],
      notes: '',
      location: '',
      status: 'tasted',
      deletedAt: recentDate,
      createdAt: recentDate,
      updatedAt: recentDate,
    })

    const purged = await purgeTombstones()
    expect(purged).toBe(0)
    expect(await db.tastings.get(id)).toBeDefined()
  })

  it('purgeTombstones returns count of purged', async () => {
    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)

    for (let i = 0; i < 3; i++) {
      await db.tastings.add({
        id: crypto.randomUUID(),
        drinkType: 'beer',
        name: `Old ${i}`,
        rating: 1,
        hasPhoto: false,
        flavors: [],
        notes: '',
        location: '',
        status: 'tasted',
        deletedAt: oldDate,
        createdAt: oldDate,
        updatedAt: oldDate,
      })
    }

    const purged = await purgeTombstones()
    expect(purged).toBe(3)
  })

  it('purgeTombstones does not remove non-deleted records', async () => {
    const id = crypto.randomUUID()
    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)

    await db.tastings.add({
      id,
      drinkType: 'wine',
      name: 'Not Deleted',
      rating: 5,
      hasPhoto: false,
      flavors: [],
      notes: '',
      location: '',
      status: 'tasted',
      createdAt: oldDate,
      updatedAt: oldDate,
    })

    const purged = await purgeTombstones()
    expect(purged).toBe(0)
    expect(await db.tastings.get(id)).toBeDefined()
  })

  it('delete + push: tombstone included in DTO (deletedAt field)', async () => {
    const id = await createTasting({
      drinkType: 'cocktail',
      name: 'Negroni',
      rating: 5,
      flavors: ['bitter'],
      notes: '',
      location: '',
    })

    await deleteTasting(id)

    const record = await db.tastings.get(id)
    const dto = toDTO(record!)
    expect(dto.deletedAt).toBeDefined()
    expect(typeof dto.deletedAt).toBe('string')
    // Should be a valid ISO date string
    expect(new Date(dto.deletedAt!).toISOString()).toBe(dto.deletedAt)
  })
})
