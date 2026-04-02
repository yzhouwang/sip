import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { BottomNav } from './components/BottomNav'
import { Collection } from './pages/Collection'
import { NewTasting } from './pages/NewTasting'
import { TastingDetail } from './pages/TastingDetail'
import { TasteDNA } from './pages/TasteDNA'
import { Settings } from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Collection />} />
          <Route path="/new" element={<NewTasting />} />
          <Route path="/edit/:id" element={<NewTasting />} />
          <Route path="/tasting/:id" element={<TastingDetail />} />
          <Route path="/dna" element={<TasteDNA />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AnimatePresence>
      <BottomNav />
    </BrowserRouter>
  )
}
