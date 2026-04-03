import { describe, it, expect, vi } from 'vitest'
import { db } from '../src/lib/db'
import { createTasting, updateTasting } from '../src/lib/tastings'
import { toDTO } from '../src/lib/sync'

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

describe('photo sync tracking', () => {
  it('new tasting has no photoSyncedAt', async () => {
    const id = await createTasting({
      drinkType: 'wine',
      name: 'No Photo',
      rating: 3,
      flavors: [],
      notes: '',
      location: '',
    })

    const stored = await db.tastings.get(id)
    expect(stored!.photoSyncedAt).toBeUndefined()
  })

  it('updateTasting with new photo clears photoSyncedAt', async () => {
    const id = await createTasting({
      drinkType: 'beer',
      name: 'Photo Test',
      rating: 4,
      flavors: [],
      notes: '',
      location: '',
    })

    // Simulate that photoSyncedAt was previously set
    await db.tastings.update(id, { photoSyncedAt: new Date() })
    let stored = await db.tastings.get(id)
    expect(stored!.photoSyncedAt).toBeInstanceOf(Date)

    // Update with a new photo
    const photo = new Blob(['new-photo'], { type: 'image/jpeg' })
    await updateTasting(id, { photo })

    stored = await db.tastings.get(id)
    expect(stored!.photoSyncedAt).toBeUndefined()
    expect(stored!.hasPhoto).toBe(true)
  })

  it('toDTO does not include photoSyncedAt (server does not need it)', () => {
    const tasting = {
      id: 'photo-dto',
      drinkType: 'sake' as const,
      name: 'Sake',
      rating: 4,
      hasPhoto: true,
      flavors: [],
      notes: '',
      location: '',
      status: 'tasted' as const,
      photoSyncedAt: new Date('2026-02-01T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    }

    const dto = toDTO(tasting as any)
    expect('photoSyncedAt' in dto).toBe(false)
  })
})
