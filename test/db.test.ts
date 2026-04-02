import { describe, it, expect } from 'vitest'
import { db, DRINK_TYPES, FLAVORS } from '../src/lib/db'
import type { Tasting } from '../src/lib/db'

function makeTasting(overrides?: Partial<Tasting>): Tasting {
  return {
    id: crypto.randomUUID(),
    drinkType: 'whisky',
    name: 'Test Whisky',
    rating: 4,
    hasPhoto: false,
    flavors: ['smoky', 'rich'],
    notes: 'Great stuff',
    location: 'Bar',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('Dexie schema', () => {
  it('stores and retrieves a tasting', async () => {
    const t = makeTasting()
    await db.tastings.add(t)
    const retrieved = await db.tastings.get(t.id)
    expect(retrieved).toBeDefined()
    expect(retrieved!.name).toBe('Test Whisky')
    expect(retrieved!.rating).toBe(4)
    expect(retrieved!.flavors).toEqual(['smoky', 'rich'])
    expect(retrieved!.hasPhoto).toBe(false)
  })

  it('indexes by updatedAt (v2)', async () => {
    const old = makeTasting({ updatedAt: new Date('2025-01-01') })
    const recent = makeTasting({ updatedAt: new Date('2026-01-01') })
    await db.tastings.bulkAdd([old, recent])

    const sorted = await db.tastings.orderBy('updatedAt').reverse().toArray()
    expect(sorted[0].id).toBe(recent.id)
  })

  it('stores hasPhoto field correctly', async () => {
    const withPhoto = makeTasting({ hasPhoto: true })
    const withoutPhoto = makeTasting({ hasPhoto: false })
    await db.tastings.bulkAdd([withPhoto, withoutPhoto])

    const r1 = await db.tastings.get(withPhoto.id)
    const r2 = await db.tastings.get(withoutPhoto.id)
    expect(r1!.hasPhoto).toBe(true)
    expect(r2!.hasPhoto).toBe(false)
  })

  it('DRINK_TYPES has 6 entries', () => {
    expect(DRINK_TYPES).toHaveLength(6)
  })

  it('FLAVORS has 15 entries', () => {
    expect(FLAVORS).toHaveLength(15)
  })
})
