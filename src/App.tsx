import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { Collection } from './pages/Collection'
import { NewTasting } from './pages/NewTasting'
import { TastingDetail } from './pages/TastingDetail'
import { TasteDNA } from './pages/TasteDNA'
import { Settings } from './pages/Settings'
import { initThemeListener } from './lib/config'
import { purgeTombstones } from './lib/db'

// Lazy-load Map page (Leaflet is heavy)
const MapPage = lazy(() => import('./pages/Map').then((m) => ({ default: m.MapPage })))

function MapFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="sip-spinner" style={{ '--spinner-color': '#00acc1' } as React.CSSProperties} />
    </div>
  )
}

export default function App() {
  useEffect(() => {
    // Initialize dark mode listener
    const cleanup = initThemeListener()

    // Purge old tombstones on app init
    purgeTombstones().catch(() => {})

    // Also purge when app comes back to foreground
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        purgeTombstones().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cleanup()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Collection />} />
        <Route path="/new" element={<NewTasting />} />
        <Route path="/edit/:id" element={<NewTasting />} />
        <Route path="/tasting/:id" element={<TastingDetail />} />
        <Route path="/dna" element={<TasteDNA />} />
        <Route path="/map" element={
          <Suspense fallback={<MapFallback />}>
            <MapPage />
          </Suspense>
        } />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  )
}
