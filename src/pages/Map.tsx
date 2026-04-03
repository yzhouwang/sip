import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { db, DRINK_LABELS } from '../lib/db'
import { DRINK_HEX, HEADER_GRADIENTS } from '../lib/theme'

export function MapPage() {
  const navigate = useNavigate()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)

  const tastings = useLiveQuery(async () => {
    const all = await db.tastings.toArray()
    return all.filter((t) => !t.deletedAt)
  })

  const withCoords = tastings?.filter((t) => t.latitude && t.longitude) ?? []
  const withoutCoords = tastings?.filter((t) => !t.latitude || !t.longitude) ?? []

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, {
      zoomControl: false,
    }).setView([35.6762, 139.6503], 3) // Default: Tokyo

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [])

  // Update markers when tastings change
  useEffect(() => {
    const map = mapInstance.current
    if (!map || !withCoords.length) return

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer)
    })

    const bounds: L.LatLngExpression[] = []

    for (const t of withCoords) {
      const color = DRINK_HEX[t.drinkType] || '#666'
      const latlng: L.LatLngExpression = [t.latitude!, t.longitude!]
      bounds.push(latlng)

      const marker = L.circleMarker(latlng, {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      })

      marker.bindPopup(`
        <div style="font-family: 'Space Grotesk', sans-serif; text-align: center;">
          <strong style="font-size: 14px;">${t.name}</strong><br/>
          <span style="font-size: 12px; color: #666;">${DRINK_LABELS[t.drinkType]}</span><br/>
          <span style="font-size: 12px;">
            ${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}
          </span>
        </div>
      `, { closeButton: false })

      marker.on('click', () => {
        navigate(`/tasting/${t.id}`)
      })

      marker.addTo(map)
    }

    // Fit bounds if we have markers
    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 14 })
    }
  }, [withCoords, navigate])

  return (
    <div className="pb-24">
      {/* Gradient Header */}
      <div
        className="px-5 pt-6 pb-5"
        style={{ background: HEADER_GRADIENTS.map }}
      >
        <h1 className="text-[36px] font-black tracking-tighter font-display leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
          Map
        </h1>
        <div className="mt-4">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-[13px] font-semibold text-white">
            📍 {withCoords.length} pinned · {withoutCoords.length} text-only
          </div>
        </div>
      </div>

      {/* Map container */}
      <div
        ref={mapRef}
        className="mx-5 mt-5 rounded-3xl overflow-hidden"
        style={{ height: 360 }}
      />

      {/* Tastings without coordinates */}
      {withoutCoords.length > 0 && (
        <div className="px-5 mt-6">
          <h3 className="text-xs text-text-light uppercase tracking-[2px] font-bold mb-3">
            Without coordinates
          </h3>
          <div className="space-y-2">
            {withoutCoords.slice(0, 10).map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/tasting/${t.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-bg-card rounded-2xl border-none cursor-pointer text-left"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: DRINK_HEX[t.drinkType] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-text truncate">{t.name}</div>
                  {t.location && (
                    <div className="text-xs text-text-muted truncate">{t.location}</div>
                  )}
                </div>
                <div className="text-xs text-text-light">
                  {t.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </button>
            ))}
            {withoutCoords.length > 10 && (
              <div className="text-xs text-text-light text-center py-2">
                +{withoutCoords.length - 10} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {tastings && tastings.length === 0 && (
        <div className="mt-16 text-center relative px-5">
          <div className="font-display text-[160px] font-black text-sake opacity-[0.04] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none leading-none">
            地
          </div>
          <div className="relative z-10">
            <div className="w-36 h-36 rounded-full mx-auto flex items-center justify-center"
              style={{ background: 'radial-gradient(circle, var(--color-sake-bg) 0%, transparent 70%)' }}>
              <span className="text-6xl">🗺️</span>
            </div>
            <div className="text-lg font-black font-display tracking-tight text-text mt-4">
              Map your tastings
            </div>
            <div className="text-[13px] text-text-muted mt-1.5 leading-relaxed">
              Enable GPS when logging<br/>to pin your sips on the map.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
