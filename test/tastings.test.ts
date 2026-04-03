import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '../src/lib/db'
import { createTasting, updateTasting, deleteTasting } from '../src/lib/tastings'

// Mock sync module to prevent actual network calls
vi.mock('../src/lib/sync', () => ({
  schedulePush: vi.fn(),
  deleteTastingFromServer: vi.fn().mockResolvedValue(undefined),
  pullAll: vi.fn().mockResolvedValue([]),
  downloadPhoto: vi.fn(),
  shouldPull: vi.fn(),
  fromDTO: vi.fn(),
  pushTasting: vi.fn(),
}))

vi.mock('../src/lib/config', () => ({
  isSyncConfigured: () => false,
  setLastSyncAt: vi.fn(),
}))

describe('tastings service', () => {
  describe('createTasting', () => {
    it('creates a tasting in Dexie', async () => {
      const id = await createTasting({
        drinkType: 'wine',
        name: 'Test Wine',
        rating: 5,
        flavors: ['fruity', 'floral'],
        notes: 'Delicious',
        location: 'Home',
      })

      expect(id).toBeDefined()
      const stored = await db.tastings.get(id)
      expect(stored).toBeDefined()
      expect(stored!.name).toBe('Test Wine')
      expect(stored!.rating).toBe(5)
      expect(stored!.drinkType).toBe('wine')
      expect(stored!.flavors).toEqual(['fruity', 'floral'])
      expect(stored!.hasPhoto).toBe(false)
      expect(stored!.createdAt).toBeInstanceOf(Date)
      expect(stored!.updatedAt).toBeInstanceOf(Date)
    })

    it('trims name, notes, and location', async () => {
      const id = await createTasting({
        drinkType: 'beer',
        name: '  Pale Ale  ',
        rating: 3,
        flavors: [],
        notes: '  Hoppy  ',
        location: '  Brewery  ',
      })

      const stored = await db.tastings.get(id)
      expect(stored!.name).toBe('Pale Ale')
      expect(stored!.notes).toBe('Hoppy')
      expect(stored!.location).toBe('Brewery')
    })

    it('sets hasPhoto true when photo provided', async () => {
      const photo = new Blob(['fake-photo'], { type: 'image/jpeg' })
      const thumb = new Blob(['fake-thumb'], { type: 'image/jpeg' })

      const id = await createTasting({
        drinkType: 'sake',
        name: 'Test Sake',
        rating: 4,
        flavors: ['crisp'],
        notes: '',
        location: '',
        photo,
        photoThumb: thumb,
      })

      const stored = await db.tastings.get(id)
      expect(stored!.hasPhoto).toBe(true)
    })
  })

  describe('updateTasting', () => {
    it('updates specific fields', async () => {
      const id = await createTasting({
        drinkType: 'cocktail',
        name: 'Old Fashioned',
        rating: 4,
        flavors: ['sweet'],
        notes: '',
        location: '',
      })

      await updateTasting(id, { rating: 5, notes: 'Actually amazing' })

      const stored = await db.tastings.get(id)
      expect(stored!.rating).toBe(5)
      expect(stored!.notes).toBe('Actually amazing')
      expect(stored!.name).toBe('Old Fashioned')  // unchanged
    })

    it('updates updatedAt timestamp', async () => {
      const id = await createTasting({
        drinkType: 'whisky',
        name: 'Lagavulin',
        rating: 5,
        flavors: ['smoky'],
        notes: '',
        location: '',
      })

      const before = (await db.tastings.get(id))!.updatedAt
      // Small delay to ensure timestamp differs
      await new Promise((r) => setTimeout(r, 10))
      await updateTasting(id, { notes: 'Updated' })

      const after = (await db.tastings.get(id))!.updatedAt
      expect(after.getTime()).toBeGreaterThan(before.getTime())
    })
  })

  describe('deleteTasting', () => {
    it('soft-deletes tasting (sets deletedAt instead of removing)', async () => {
      const id = await createTasting({
        drinkType: 'wine',
        name: 'To Delete',
        rating: 1,
        flavors: [],
        notes: '',
        location: '',
      })

      expect(await db.tastings.get(id)).toBeDefined()
      await deleteTasting(id)
      // Soft delete: record still exists but has deletedAt set
      const deleted = await db.tastings.get(id)
      expect(deleted).toBeDefined()
      expect(deleted!.deletedAt).toBeDefined()
      expect(deleted!.deletedAt).toBeInstanceOf(Date)
    })
  })
})
