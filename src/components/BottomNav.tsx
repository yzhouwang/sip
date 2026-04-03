import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { onSyncStatus, type SyncStatus } from '../lib/sync'

function CollectionIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a1a1a' : '#888888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )
}

function DNAIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a1a1a' : '#888888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  )
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#1a1a1a' : '#888888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

const tabs = [
  { path: '/', label: 'Collection', Icon: CollectionIcon },
  { path: '/dna', label: 'DNA', Icon: DNAIcon },
  { path: '/settings', label: 'Settings', Icon: SettingsIcon },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  useEffect(() => {
    return onSyncStatus(setSyncStatus)
  }, [])

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-bg border-t border-border flex justify-around py-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-50">
      {tabs.map((tab) => {
        const active = location.pathname === tab.path
        const showSyncDot = tab.path === '/settings' && syncStatus === 'error'
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer relative px-6 py-1.5 min-w-[48px] min-h-[48px]"
          >
            {active && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-text rounded-full"
              />
            )}
            <tab.Icon active={active} />
            <span
              className={`text-[11px] font-bold tracking-wide ${active ? 'text-text' : 'text-text-light'}`}
            >
              {tab.label}
            </span>
            {showSyncDot && (
              <div className="absolute top-0 right-4 w-2.5 h-2.5 rounded-full bg-[#c62828]" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
