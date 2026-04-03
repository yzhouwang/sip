const STORAGE_KEYS = {
  serverUrl: 'sip_server_url',
  apiKey: 'sip_api_key',
  lastSyncAt: 'sip_last_sync_at',
} as const

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

/** Check if hostname is a private/RFC-1918 IP address */
function isPrivateIP(hostname: string): boolean {
  // 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x (link-local)
  return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.)/.test(hostname)
}

/** Validate the server URL. Must be HTTPS (except localhost for dev). */
export function validateServerUrl(url: string): string | null {
  if (!url.trim()) return 'Server URL is required'
  try {
    const parsed = new URL(url)
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    if (parsed.protocol !== 'https:' && !isLocal) {
      return 'HTTPS required (except localhost)'
    }
    if (parsed.protocol === 'http:' && !isLocal && isPrivateIP(parsed.hostname)) {
      return 'HTTPS required for private network addresses'
    }
    return null
  } catch {
    return 'Invalid URL'
  }
}
