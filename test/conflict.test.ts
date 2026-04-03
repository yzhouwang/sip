import { describe, it, expect } from 'vitest'
import { hasConflict, shouldPull } from '../src/lib/sync'

describe('hasConflict', () => {
  it('returns true when both sides changed after lastSyncedAt', () => {
    const local = {
      updatedAt: new Date('2026-03-10T14:00:00Z'),
      lastSyncedAt: new Date('2026-03-10T10:00:00Z'),
    }
    const server = { updatedAt: '2026-03-10T12:00:00.000Z' }
    expect(hasConflict(local, server)).toBe(true)
  })

  it('returns false when only server changed', () => {
    const local = {
      updatedAt: new Date('2026-03-10T09:00:00Z'), // before lastSyncedAt
      lastSyncedAt: new Date('2026-03-10T10:00:00Z'),
    }
    const server = { updatedAt: '2026-03-10T12:00:00.000Z' }
    expect(hasConflict(local, server)).toBe(false)
  })

  it('returns false when only local changed', () => {
    const local = {
      updatedAt: new Date('2026-03-10T14:00:00Z'),
      lastSyncedAt: new Date('2026-03-10T10:00:00Z'),
    }
    const server = { updatedAt: '2026-03-10T08:00:00.000Z' } // before lastSyncedAt
    expect(hasConflict(local, server)).toBe(false)
  })

  it('returns false when neither changed', () => {
    const local = {
      updatedAt: new Date('2026-03-10T09:00:00Z'),
      lastSyncedAt: new Date('2026-03-10T10:00:00Z'),
    }
    const server = { updatedAt: '2026-03-10T08:00:00.000Z' }
    expect(hasConflict(local, server)).toBe(false)
  })

  it('treats undefined lastSyncedAt as 0 (conflict if both have updates)', () => {
    const local = {
      updatedAt: new Date('2026-03-10T14:00:00Z'),
      lastSyncedAt: undefined,
    }
    const server = { updatedAt: '2026-03-10T12:00:00.000Z' }
    // Both are after epoch 0, so both changed since "last sync"
    expect(hasConflict(local, server)).toBe(true)
  })

  it('returns false for invalid server date', () => {
    const local = {
      updatedAt: new Date('2026-03-10T14:00:00Z'),
      lastSyncedAt: new Date('2026-03-10T10:00:00Z'),
    }
    expect(hasConflict(local, { updatedAt: 'not-a-date' })).toBe(false)
  })
})

describe('shouldPull', () => {
  it('returns true when server is newer', () => {
    const local = { updatedAt: new Date('2026-03-10T10:00:00Z') }
    const server = { updatedAt: '2026-03-10T14:00:00.000Z' }
    expect(shouldPull(local, server)).toBe(true)
  })

  it('returns false when local is newer', () => {
    const local = { updatedAt: new Date('2026-03-10T14:00:00Z') }
    const server = { updatedAt: '2026-03-10T10:00:00.000Z' }
    expect(shouldPull(local, server)).toBe(false)
  })

  it('returns false when timestamps are equal', () => {
    const local = { updatedAt: new Date('2026-03-10T10:00:00Z') }
    const server = { updatedAt: '2026-03-10T10:00:00.000Z' }
    expect(shouldPull(local, server)).toBe(false)
  })

  it('returns false for invalid server date', () => {
    const local = { updatedAt: new Date('2026-03-10T10:00:00Z') }
    expect(shouldPull(local, { updatedAt: '' })).toBe(false)
  })
})
