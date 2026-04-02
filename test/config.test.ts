import { describe, it, expect, beforeEach } from 'vitest'
import {
  getServerUrl, setServerUrl, getApiKey, setApiKey,
  isSyncConfigured, clearSyncConfig, validateServerUrl,
  getLastSyncAt, setLastSyncAt,
} from '../src/lib/config'

beforeEach(() => {
  localStorage.clear()
})

describe('config', () => {
  it('getServerUrl returns null when not set', () => {
    expect(getServerUrl()).toBeNull()
  })

  it('setServerUrl and getServerUrl round-trip', () => {
    setServerUrl('https://my-server.com/')
    expect(getServerUrl()).toBe('https://my-server.com')  // trailing slash stripped
  })

  it('setApiKey and getApiKey round-trip', () => {
    setApiKey('my-secret-key')
    expect(getApiKey()).toBe('my-secret-key')
  })

  it('isSyncConfigured returns false when no config', () => {
    expect(isSyncConfigured()).toBe(false)
  })

  it('isSyncConfigured returns true when both set', () => {
    setServerUrl('https://server.com')
    setApiKey('key')
    expect(isSyncConfigured()).toBe(true)
  })

  it('clearSyncConfig removes everything', () => {
    setServerUrl('https://server.com')
    setApiKey('key')
    setLastSyncAt('2026-01-01T00:00:00Z')
    clearSyncConfig()
    expect(getServerUrl()).toBeNull()
    expect(getApiKey()).toBeNull()
    expect(getLastSyncAt()).toBeNull()
  })

  describe('validateServerUrl', () => {
    it('accepts https URLs', () => {
      expect(validateServerUrl('https://my-server.com')).toBeNull()
    })

    it('accepts localhost without https', () => {
      expect(validateServerUrl('http://localhost:3001')).toBeNull()
    })

    it('accepts 127.0.0.1 without https', () => {
      expect(validateServerUrl('http://127.0.0.1:3001')).toBeNull()
    })

    it('rejects http for non-localhost', () => {
      expect(validateServerUrl('http://my-server.com')).toBe('HTTPS required (except localhost)')
    })

    it('rejects empty string', () => {
      expect(validateServerUrl('')).toBe('Server URL is required')
    })

    it('rejects invalid URL', () => {
      expect(validateServerUrl('not-a-url')).toBe('Invalid URL')
    })
  })
})
