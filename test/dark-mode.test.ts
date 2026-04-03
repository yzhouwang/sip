import { describe, it, expect, beforeEach } from 'vitest'
import {
  getThemePreference,
  setThemePreference,
  validateServerUrl,
} from '../src/lib/config'

beforeEach(() => {
  localStorage.clear()
})

describe('theme preference', () => {
  it('getThemePreference returns system by default', () => {
    expect(getThemePreference()).toBe('system')
  })

  it('setThemePreference stores to localStorage', () => {
    setThemePreference('dark')
    expect(localStorage.getItem('sip_theme')).toBe('dark')
  })

  it('getThemePreference returns stored value', () => {
    setThemePreference('light')
    expect(getThemePreference()).toBe('light')
  })

  it('getThemePreference returns dark after setting dark', () => {
    setThemePreference('dark')
    expect(getThemePreference()).toBe('dark')
  })
})

describe('validateServerUrl — private IP handling', () => {
  it('rejects HTTP for private IPs (10.x.x.x)', () => {
    const err = validateServerUrl('http://10.0.0.5:3000')
    expect(err).toBe('HTTPS required for private network addresses')
  })

  it('rejects HTTP for private IPs (192.168.x.x)', () => {
    const err = validateServerUrl('http://192.168.1.100:8080')
    expect(err).toBe('HTTPS required for private network addresses')
  })

  it('rejects HTTP for private IPs (172.16-31.x.x)', () => {
    const err = validateServerUrl('http://172.16.0.1:3000')
    expect(err).toBe('HTTPS required for private network addresses')
  })

  it('allows HTTP for localhost', () => {
    expect(validateServerUrl('http://localhost:3001')).toBeNull()
  })

  it('allows HTTP for 127.0.0.1', () => {
    expect(validateServerUrl('http://127.0.0.1:3001')).toBeNull()
  })

  it('allows HTTPS for any host', () => {
    expect(validateServerUrl('https://my-server.example.com')).toBeNull()
    expect(validateServerUrl('https://10.0.0.5:3000')).toBeNull()
    expect(validateServerUrl('https://192.168.1.1')).toBeNull()
  })

  it('rejects HTTP for public IPs', () => {
    const err = validateServerUrl('http://203.0.113.50:8080')
    expect(err).toBe('HTTPS required (except localhost)')
  })
})
