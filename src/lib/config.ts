const STORAGE_KEYS = {
  serverUrl: 'sip_server_url',
  apiKey: 'sip_api_key',
  lastSyncAt: 'sip_last_sync_at',
  theme: 'sip_theme',
} as const

export type ThemePreference = 'system' | 'light' | 'dark'

export function getServerUrl(): string | null {
  return localStorage.getItem(STORAGE_KEYS.serverUrl) || null
}

export function setServerUrl(url: string): void {
  localStorage.setItem(STORAGE_KEYS.serverUrl, url.replace(/\/$/, ''))
}

export function getApiKey(): string | null {
  return localStorage.getItem(STORAGE_KEYS.apiKey) || null
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEYS.apiKey, key)
}

export function getLastSyncAt(): string | null {
  return localStorage.getItem(STORAGE_KEYS.lastSyncAt) || null
}

export function setLastSyncAt(ts: string): void {
  localStorage.setItem(STORAGE_KEYS.lastSyncAt, ts)
}

export function isSyncConfigured(): boolean {
  return !!(getServerUrl() && getApiKey())
}

export function clearSyncConfig(): void {
  localStorage.removeItem(STORAGE_KEYS.serverUrl)
  localStorage.removeItem(STORAGE_KEYS.apiKey)
  localStorage.removeItem(STORAGE_KEYS.lastSyncAt)
}

export function getThemePreference(): ThemePreference {
  return (localStorage.getItem(STORAGE_KEYS.theme) as ThemePreference) || 'system'
}

export function setThemePreference(theme: ThemePreference): void {
  localStorage.setItem(STORAGE_KEYS.theme, theme)
  applyTheme(theme)
}

/** Apply theme to document. Call on init and on change. */
export function applyTheme(pref?: ThemePreference): void {
  const theme = pref || getThemePreference()
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

/** Listen for OS-level theme changes when preference is 'system' */
export function initThemeListener(): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => {
    if (getThemePreference() === 'system') applyTheme('system')
  }
  mq.addEventListener('change', handler)
  applyTheme()
  return () => mq.removeEventListener('change', handler)
}

/** Check if hostname is a private/RFC-1918 IP address */
function isPrivateIP(hostname: string): boolean {
  return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(hostname)
}

/** Validate the server URL. Must be HTTPS (except localhost for dev). */
export function validateServerUrl(url: string): string | null {
  if (!url.trim()) return 'Server URL is required'
  try {
    const parsed = new URL(url)
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    if (parsed.protocol === 'http:' && !isLocal) {
      if (isPrivateIP(parsed.hostname)) {
        return 'HTTPS required for private network addresses'
      }
      return 'HTTPS required (except localhost)'
    }
    return null
  } catch {
    return 'Invalid URL'
  }
}
