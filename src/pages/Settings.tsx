import { useState } from 'react'
import { db } from '../lib/db'
import type { Tasting } from '../lib/db'

export function Settings() {
  const [status, setStatus] = useState<string>()

  const handleExport = async () => {
    try {
      const tastings = await db.tastings.toArray()
      // Convert blobs to base64 for JSON export
      const exportData = await Promise.all(
        tastings.map(async (t) => {
          const photoBase64 = t.photo ? await blobToBase64(t.photo) : undefined
          const thumbBase64 = t.photoThumb ? await blobToBase64(t.photoThumb) : undefined
          return {
            ...t,
            photo: photoBase64,
            photoThumb: thumbBase64,
            createdAt: t.createdAt.toISOString(),
            updatedAt: t.updatedAt.toISOString(),
          }
        }),
      )
      const json = JSON.stringify({ version: 1, tastings: exportData }, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sip-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatus(`Exported ${tastings.length} tastings`)
    } catch (err) {
      setStatus('Export failed')
      console.error(err)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.tastings || !Array.isArray(data.tastings)) {
        setStatus('Invalid backup file')
        return
      }
      let imported = 0
      for (const t of data.tastings) {
        const tasting: Tasting = {
          ...t,
          photo: t.photo ? base64ToBlob(t.photo) : undefined,
          photoThumb: t.photoThumb ? base64ToBlob(t.photoThumb) : undefined,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
        }
        const existing = await db.tastings.get(tasting.id)
        if (!existing) {
          await db.tastings.add(tasting)
          imported++
        }
      }
      setStatus(`Imported ${imported} new tastings (${data.tastings.length - imported} already existed)`)
    } catch (err) {
      setStatus('Import failed — invalid file')
      console.error(err)
    }
    e.target.value = ''
  }

  return (
    <div className="pb-24 px-5">
      <div className="pt-5">
        <h2 className="text-4xl font-black tracking-tighter font-display">Settings</h2>
      </div>

      <div className="mt-8">
        <h3 className="text-xs text-text-light uppercase tracking-[2px] font-bold mb-4">
          Data Backup
        </h3>

        <button
          onClick={handleExport}
          className="w-full py-4 px-5 rounded-2xl bg-text text-white text-base font-bold border-none cursor-pointer mb-3"
        >
          📦 Export All Data
        </button>

        <label className="block w-full py-4 px-5 rounded-2xl bg-bg-input text-text text-base font-bold cursor-pointer text-center">
          📥 Import Backup
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>

        {status && (
          <p className="mt-3 text-sm text-text-muted text-center">{status}</p>
        )}

        <p className="mt-4 text-xs text-text-light leading-relaxed">
          Export saves all your tastings (including photos) as a JSON file. Import merges
          a backup into your collection without overwriting existing entries. Recommended: export
          regularly since browser storage can be cleared.
        </p>
      </div>

      <div className="mt-10 text-center text-xs text-text-light">
        <p className="font-bold">Sip v1.0</p>
        <p className="mt-1">Your data stays on this device.</p>
      </div>
    </div>
  )
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function base64ToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',')
  const mime = meta.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bytes = atob(b64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: mime })
}
