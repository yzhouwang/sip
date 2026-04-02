import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { onSyncStatus, type SyncStatus } from '../lib/sync'

const tabs = [
  { path: '/', label: 'Collection', icon: '◻' },
  { path: '/dna', label: 'DNA', icon: '◇' },
  { path: '/settings', label: 'Settings', icon: '⚙' },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  useEffect(() => {
    return onSyncStatus(setSyncStatus)
  }, [])

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-bg border-t border-border flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-50">
      {tabs.map((tab) => {
        const active = location.pathname === tab.path
        const showSyncDot = tab.path === '/settings' && syncStatus === 'error'
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center gap-0.5 bg-transparent border-none cursor-pointer relative px-6 py-1"
          >
            <span className={`text-xl ${active ? 'text-text' : 'text-text-light'}`}>
              {tab.icon}
            </span>
            <span
              className={`text-[11px] font-bold tracking-wide ${active ? 'text-text' : 'text-text-light'}`}
            >
              {tab.label}
            </span>
            {active && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-text rounded-full"
              />
            )}
            {showSyncDot && (
              <div className="absolute top-0 right-4 w-2.5 h-2.5 rounded-full bg-[#c62828]" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
