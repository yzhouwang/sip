/**
 * Tests for conflict resolution flow
 * Covers: resolveConflict keep-local, keep-server, multiple conflicts
 */
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '../src/lib/db'
import type { Tasting, TastingDTO } from '../src/lib/db'
import { resolveConflict, type ConflictItem } from '../src/lib/tastings'

function makeTasting(overrides: Partial<Tasting> = {}): Tasting {
  return {
    id: 'test-1',
    drinkType: 'whisky',
    name: 'Lagavulin 16',
    rating: 5,
    hasPhoto: false,
    flavors: ['smoky', 'rich'],
    notes: 'Local version',
    location: 'Tokyo',
    status: 'tasted',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-15T10:00:00Z'),
    lastSyncedAt: new Date('2024-06-01T00:00:00Z'),
    ...overrides,
  }
}

function makeDTO(overrides: Partial<TastingDTO> = {}): TastingDTO {
  return {
    id: 'test-1',
    drinkType: 'whisky',
    name: 'Lagavulin 16 Year',
    rating: 4,
    hasPhoto: false,
    flavors: ['smoky', 'rich', 'oaky'],
    notes: 'Server version',
    location: 'Islay',
    status: 'tasted',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-06-15T12:00:00.000Z',
    ...overrides,
  }
}

describe('resolveConflict', () => {
  beforeEach(async () => {
    await db.tastings.clear()
  })

  it('keeps local version and marks for re-push', async () => {
    const local = makeTasting()
    await db.tastings.add(local)

    const conflict: ConflictItem = { local, server: makeDTO() }
    await resolveConflict(conflict, 'local')

    const result = await db.tastings.get('test-1')
    expect(result).toBeDefined()
    // Local data preserved
    expect(result!.name).toBe('Lagavulin 16')
    expect(result!.notes).toBe('Local version')
    expect(result!.rating).toBe(5)
    // lastSyncedAt cleared to force re-push
    expect(result!.lastSyncedAt).toBeUndefined()
  })

  it('keeps server version and overwrites local', async () => {
    const local = makeTasting()
    await db.tastings.add(local)

    const conflict: ConflictItem = { local, server: makeDTO() }
    await resolveConflict(conflict, 'server')

    const result = await db.tastings.get('test-1')
    expect(result).toBeDefined()
    // Server data applied
    expect(result!.name).toBe('Lagavulin 16 Year')
    expect(result!.notes).toBe('Server version')
    expect(result!.rating).toBe(4)
    expect(result!.location).toBe('Islay')
    expect(result!.flavors).toEqual(['smoky', 'rich', 'oaky'])
    // Marked as synced
    expect(result!.lastSyncedAt).toBeDefined()
  })

  it('handles server tombstone conflict (keep local restores it)', async () => {
    const local = makeTasting()
    await db.tastings.add(local)

    const conflict: ConflictItem = {
      local,
      server: makeDTO({ deletedAt: '2024-06-15T12:00:00.000Z' }),
    }
    await resolveConflict(conflict, 'local')

    const result = await db.tastings.get('test-1')
    expect(result).toBeDefined()
    expect(result!.name).toBe('Lagavulin 16')
    expect(result!.deletedAt).toBeUndefined()
  })

  it('handles multiple sequential conflicts', async () => {
    const local1 = makeTasting({ id: 'c1', name: 'Tasting A' })
    const local2 = makeTasting({ id: 'c2', name: 'Tasting B' })
    await db.tastings.bulkAdd([local1, local2])

    const conflicts: ConflictItem[] = [
      { local: local1, server: makeDTO({ id: 'c1', name: 'Server A' }) },
      { local: local2, server: makeDTO({ id: 'c2', name: 'Server B' }) },
    ]

    // Keep local for first, server for second
    await resolveConflict(conflicts[0], 'local')
    await resolveConflict(conflicts[1], 'server')

    const r1 = await db.tastings.get('c1')
    const r2 = await db.tastings.get('c2')
    expect(r1!.name).toBe('Tasting A') // kept local
    expect(r2!.name).toBe('Server B')  // kept server
  })
})
