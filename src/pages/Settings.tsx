import { useState, useEffect } from 'react'
import { db, DRINK_TYPES } from '../lib/db'
import type { Tasting, DrinkType, FlavorId, TastingStatus } from '../lib/db'
import {
  getServerUrl, setServerUrl as saveServerUrl,
  getApiKey, setApiKey as saveApiKey,
  getLastSyncAt, isSyncConfigured, clearSyncConfig,
  validateServerUrl,
  getThemePreference, setThemePreference,
  type ThemePreference,
} from '../lib/config'
import { testConnection, onSyncStatus, type SyncStatus } from '../lib/sync'
import { pushAllToServer, pullFromServer } from '../lib/tastings'

const VALID_FLAVORS = new Set([
  'smoky', 'earthy', 'briny', 'sweet', 'floral', 'citrus', 'spicy',
  'fruity', 'rich', 'bitter', 'umami', 'herbal', 'nutty', 'oaky', 'crisp',
])

type ConnectionState = 'unconfigured' | 'configuring' | 'connected' | 'error'

function validateTasting(t: unknown): string | null {
  if (!t || typeof t !== 'object') return 'Invalid tasting object'
  const obj = t as Record<string, unknown>
  if (typeof obj.id !== 'string' || !obj.id) return 'Missing or invalid id'
  if (typeof obj.name !== 'string' || !obj.name) return 'Missing or invalid name'
  if (typeof obj.rating !== 'number' || obj.rating < 1 || obj.rating > 5 || !Number.isInteger(obj.rating)) return 'Rating must be integer 1-5'
  if (typeof obj.drinkType !== 'string' || !DRINK_TYPES.includes(obj.drinkType as DrinkType)) return 'Invalid drinkType'
  if (!Array.isArray(obj.flavors) || obj.flavors.length > 5 || !obj.flavors.every((f: unknown) => typeof f === 'string' && VALID_FLAVORS.has(f))) return 'Invalid flavors'
  if (typeof obj.notes !== 'string') return 'Invalid notes'
  if (typeof obj.location !== 'string') return 'Invalid location'
  if (typeof obj.createdAt !== 'string' || isNaN(Date.parse(obj.createdAt))) return 'Invalid createdAt'
  if (typeof obj.updatedAt !== 'string' || isNaN(Date.parse(obj.updatedAt))) return 'Invalid updatedAt'
  return null
}

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function base64ToBlob(dataUrl: string): Blob | undefined {
  try {
    if (typeof dataUrl !== 'string' || !dataUrl.includes(',')) return undefined
    const [meta, b64] = dataUrl.split(',')
    if (!b64) return undefined
    const mime = meta.match(/:(.*?);/)?.[1] || 'image/jpeg'
    if (!ALLOWED_IMAGE_MIMES.has(mime)) return undefined
    const bytes = atob(b64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    return new Blob([arr], { type: mime })
  } catch {
    return undefined
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export function Settings() {
  const [status, setStatus] = useState<string>()
  const [statusType, setStatusType] = useState<'info' | 'error'>('info')

  // Cloud sync state
  const [connState, setConnState] = useState<ConnectionState>(
    isSyncConfigured() ? 'connected' : 'unconfigured'
  )
  const [serverUrl, setServerUrl] = useState(getServerUrl() || '')
  const [apiKey, setApiKey] = useState(getApiKey() || '')
  const [urlError, setUrlError] = useState<string>()
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string }>()
  const [testing, setTesting] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [pushProgress, setPushProgress] = useState<{ done: number; total: number }>()
  const [pullProgress, setPullProgress] = useState<{ done: number; total: number }>()
  const [lastSync, setLastSync] = useState(getLastSyncAt())
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference())

  useEffect(() => {
    return onSyncStatus(setSyncStatus)
  }, [])

  const showStatus = (msg: string, type: 'info' | 'error' = 'info') => {
    setStatus(msg)
    setStatusType(type)
  }

  const handleTestConnection = async () => {
    // Validate URL first
    const err = validateServerUrl(serverUrl)
    if (err) {
      setUrlError(err)
      return
    }
    setUrlError(undefined)

    // Save config
    saveServerUrl(serverUrl)
    saveApiKey(apiKey)

    setTesting(true)
    setTestResult(undefined)
    const result = await testConnection()
    setTestResult(result)
    setTesting(false)

    if (result.ok) {
      setConnState('connected')
    } else {
      setConnState('error')
    }
  }

  const handleDisconnect = () => {
    clearSyncConfig()
    setConnState('unconfigured')
    setServerUrl('')
    setApiKey('')
    setTestResult(undefined)
    setLastSync(null)
  }

  const handlePushAll = async () => {
    if (!isSyncConfigured()) {
      setConnState('unconfigured')
      showStatus('Server disconnected. Reconfigure to push.', 'error')
      return
    }
    setPushProgress({ done: 0, total: 0 })
    try {
      const result = await pushAllToServer((done, total) => {
        setPushProgress({ done, total })
      })
      setPushProgress(undefined)
      setLastSync(getLastSyncAt())
      showStatus(`Pushed ${result.pushed} tastings${result.errors ? `, ${result.errors} errors` : ''}`)
    } catch (err) {
      setPushProgress(undefined)
      showStatus('Push failed', 'error')
      console.error(err)
    }
  }

  const handlePullAll = async () => {
    if (!isSyncConfigured()) {
      setConnState('unconfigured')
      showStatus('Server disconnected. Reconfigure to pull.', 'error')
      return
    }
    setPullProgress({ done: 0, total: 0 })
    try {
      const result = await pullFromServer((done, total) => {
        setPullProgress({ done, total })
      })
      setPullProgress(undefined)
      setLastSync(getLastSyncAt())
      showStatus(`Added ${result.added}, updated ${result.updated}${result.errors ? `, ${result.errors} errors` : ''}`)
    } catch (err) {
      setPullProgress(undefined)
      showStatus('Pull failed', 'error')
      console.error(err)
    }
  }

  const handleExport = async () => {
    try {
      const tastings = await db.tastings.toArray()
      const exportData: unknown[] = []
      for (const t of tastings) {
        const photoBase64 = t.photo ? await blobToBase64(t.photo) : undefined
        const thumbBase64 = t.photoThumb ? await blobToBase64(t.photoThumb) : undefined
        exportData.push({
          ...t,
          photo: photoBase64,
          photoThumb: thumbBase64,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })
      }
      const json = JSON.stringify({ version: 1, tastings: exportData }, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sip-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showStatus(`Exported ${tastings.length} tastings`)
    } catch (err) {
      console.error('Export failed:', err)
      showStatus('Export failed', 'error')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.tastings || !Array.isArray(data.tastings)) {
        showStatus('Invalid backup file', 'error')
        e.target.value = ''
        return
      }

      let imported = 0
      let skipped = 0
      let invalid = 0

      await db.transaction('rw', db.tastings, async () => {
        for (const raw of data.tastings) {
          const validationError = validateTasting(raw)
          if (validationError) {
            invalid++
            continue
          }
          const existing = await db.tastings.get(raw.id)
          if (existing) {
            skipped++
            continue
          }
          const photo = raw.photo ? base64ToBlob(raw.photo) : undefined
          const photoThumb = raw.photoThumb ? base64ToBlob(raw.photoThumb) : undefined
          const tasting: Tasting = {
            id: raw.id,
            drinkType: raw.drinkType as DrinkType,
            name: raw.name,
            rating: raw.rating,
            photo,
            photoThumb,
            hasPhoto: !!(photo || photoThumb),
            flavors: raw.flavors as FlavorId[],
            notes: raw.notes || '',
            location: raw.location || '',
            status: (raw.status as TastingStatus) || 'tasted',
            createdAt: new Date(raw.createdAt),
            updatedAt: new Date(raw.updatedAt),
          }
          await db.tastings.add(tasting)
          imported++
        }
      })

      const parts = [`Imported ${imported} new`]
      if (skipped > 0) parts.push(`${skipped} existed`)
      if (invalid > 0) parts.push(`${invalid} invalid`)
      showStatus(parts.join(', '))
    } catch (err) {
      console.error('Import failed:', err)
      showStatus('Import failed', 'error')
    }
    e.target.value = ''
  }

  // Progress overlay
  const progressOverlay = pushProgress || pullProgress
  const progress = pushProgress || pullProgress

  return (
    <div className="pb-24">
      {/* Progress overlay */}
      {progressOverlay && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 mx-6 w-full max-w-sm text-center">
            <div className="text-4xl mb-3">{pushProgress ? '☁️' : '📥'}</div>
            <div className="text-lg font-bold text-text">
              {pushProgress ? 'Pushing to server...' : 'Pulling from server...'}
            </div>
            {progress && progress.total > 0 && (
              <>
                <div className="mt-4 h-2.5 bg-bg-input rounded-full overflow-hidden">
                  <div
                    className="h-full bg-text rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                  />
                </div>
                <div className="mt-2 text-sm text-text-muted font-semibold">
                  {progress.done} / {progress.total}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Gradient Header */}
      <div
        className="px-5 pt-8 pb-6"
        style={{ background: 'linear-gradient(135deg, #3949ab 0%, #5c6bc0 40%, var(--color-bg) 100%)' }}
      >
        <h1 className="text-[36px] font-black tracking-tighter font-display leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
          Settings
        </h1>
        <div className="mt-4">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-[13px] font-semibold text-white">
            ⚙️ {connState === 'connected' ? 'Cloud backup enabled' : 'Local only'}
          </div>
        </div>
      </div>

      <div className="px-5">
      {/* Dark Mode */}
      <div className="mt-8">
        <h3 className="text-xs text-text-light uppercase tracking-[2px] font-bold mb-4">
          Appearance
        </h3>
        <div className="flex gap-2">
          {(['system', 'light', 'dark'] as ThemePreference[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTheme(t); setThemePreference(t) }}
              className={`flex-1 py-3 rounded-2xl text-sm font-bold border-none cursor-pointer transition-all ${
                theme === t
                  ? 'bg-text text-bg-card scale-105'
                  : 'bg-bg-input text-text-muted'
              }`}
            >
              {t === 'system' ? '🖥 System' : t === 'light' ? '☀️ Light' : '🌙 Dark'}
            </button>
          ))}
        </div>
      </div>

      {/* Cloud Sync Section */}
      <div className="mt-8">
        <h3 className="text-xs text-text-light uppercase tracking-[2px] font-bold mb-4">
          Cloud Backup
          {syncStatus === 'error' && <span className="ml-2 text-[#c62828]">● sync failed</span>}
          {syncStatus === 'syncing' && <span className="ml-2 text-text-muted">● syncing...</span>}
        </h3>

        {connState === 'unconfigured' ? (
          /* Onboarding card */
          <div className="bg-bg-card rounded-3xl p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="text-2xl mb-2">☁️</div>
            <div className="text-base font-bold text-text">Back up to your server</div>
            <div className="text-sm text-text-muted mt-1.5 leading-relaxed">
              Connect to your VPS to automatically sync tastings. Your data survives device changes
              and browser storage clearing.
            </div>
            <button
              onClick={() => setConnState('configuring')}
              className="mt-4 w-full py-3 rounded-2xl text-white text-sm font-bold border-none cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #3949ab, #5c6bc0)',
                boxShadow: '0 4px 16px rgba(57, 73, 171, 0.3)',
              }}
            >
              Set up cloud backup
            </button>
          </div>
        ) : connState === 'configuring' || connState === 'error' ? (
          /* Config fields */
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-light uppercase tracking-[1px] font-bold">Server URL</label>
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => { setServerUrl(e.target.value); setUrlError(undefined) }}
                placeholder="https://your-server.com"
                className="w-full mt-1.5 px-4 py-3 bg-bg-input border-none rounded-xl text-sm font-semibold text-text placeholder:text-text-light outline-none font-sans"
              />
              {urlError && <p className="mt-1 text-xs text-[#c62828] font-semibold">{urlError}</p>}
            </div>
            <div>
              <label className="text-xs text-text-light uppercase tracking-[1px] font-bold">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Your API key"
                className="w-full mt-1.5 px-4 py-3 bg-bg-input border-none rounded-xl text-sm font-semibold text-text placeholder:text-text-light outline-none font-sans"
              />
            </div>

            {testResult && (
              <div className={`px-4 py-3 rounded-xl text-sm font-bold ${
                testResult.ok ? 'bg-[#2e7d32]/10 text-[#2e7d32]' : 'bg-[#c62828]/10 text-[#c62828]'
              }`}>
                {testResult.ok ? '✓ Connected' : `✗ ${testResult.error}`}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleTestConnection}
                disabled={!serverUrl.trim() || !apiKey.trim() || testing}
                className="flex-1 py-3 rounded-2xl bg-text text-white text-sm font-bold border-none cursor-pointer disabled:opacity-40"
              >
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={() => {
                  setConnState(isSyncConfigured() ? 'connected' : 'unconfigured')
                  setTestResult(undefined)
                }}
                className="py-3 px-4 rounded-2xl bg-bg-input text-text-muted text-sm font-bold border-none cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Connected state */
          <div className="space-y-3">
            <div className="bg-[#2e7d32]/10 rounded-3xl px-4 py-3 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#2e7d32]" />
              <div className="flex-1">
                <div className="text-sm font-bold text-[#2e7d32]">Connected</div>
                <div className="text-xs text-text-muted mt-0.5">
                  {getServerUrl()}
                  {lastSync && ` · Synced ${relativeTime(lastSync)}`}
                </div>
              </div>
              <button
                onClick={() => setConnState('configuring')}
                className="text-xs text-text-muted font-bold bg-transparent border-none cursor-pointer"
              >
                Edit
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePushAll}
                disabled={!!progressOverlay}
                className="flex-1 py-3.5 rounded-2xl text-white text-sm font-bold border-none cursor-pointer disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #3949ab, #5c6bc0)',
                  boxShadow: '0 4px 16px rgba(57, 73, 171, 0.25)',
                }}
              >
                ☁️ Push All
              </button>
              <button
                onClick={handlePullAll}
                disabled={!!progressOverlay}
                className="flex-1 py-3.5 rounded-2xl bg-bg-card text-text text-sm font-bold border-none cursor-pointer disabled:opacity-40"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                📥 Pull All
              </button>
            </div>

            <p className="text-xs text-text-light leading-relaxed">
              Push sends all local tastings to your server. Pull downloads tastings from server
              (including any previously deleted locally).
            </p>

            <button
              onClick={handleDisconnect}
              className="w-full py-2.5 text-xs text-text-light font-semibold bg-transparent border-none cursor-pointer"
            >
              Disconnect server
            </button>
          </div>
        )}
      </div>

      {/* Local Backup Section */}
      <div className="mt-10">
        <h3 className="text-xs text-text-light uppercase tracking-[2px] font-bold mb-4">
          Local Backup
        </h3>

        <button
          onClick={handleExport}
          className="w-full py-4 px-5 rounded-3xl bg-bg-card text-text text-base font-bold border-none cursor-pointer mb-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          📦 Export All Data
        </button>

        <label className="block w-full py-4 px-5 rounded-3xl bg-bg-card text-text text-base font-bold cursor-pointer text-center"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          📥 Import Backup
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>

        {status && (
          <p className={`mt-3 text-sm text-center font-semibold ${
            statusType === 'error' ? 'text-[#c62828]' : 'text-text-muted'
          }`}>
            {status}
          </p>
        )}

        <p className="mt-3 text-xs text-text-light leading-relaxed">
          JSON file with all tastings and photos. Use as a fallback if cloud isn't set up.
        </p>
      </div>

      <div className="mt-12 text-center text-xs text-text-light">
        <p className="font-bold">Sip v1.3</p>
        <p className="mt-1">
          {isSyncConfigured() ? 'Cloud backup enabled' : 'Your data stays on this device'}
        </p>
      </div>
      </div>
    </div>
  )
}
