import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DRINK_LABELS, DRINK_EMOJI } from '../lib/db'
import { resolveConflict, type ConflictItem } from '../lib/tastings'

interface ConflictModalProps {
  conflicts: ConflictItem[]
  onResolved: () => void
}

function formatDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm tracking-wide">
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  )
}

export function ConflictModal({ conflicts, onResolved }: ConflictModalProps) {
  const [index, setIndex] = useState(0)
  const [resolving, setResolving] = useState(false)

  if (conflicts.length === 0) return null

  const current = conflicts[index]
  const { local, server } = current
  const emoji = DRINK_EMOJI[local.drinkType] || DRINK_EMOJI[server.drinkType] || '🍹'

  const handleResolve = async (keep: 'local' | 'server') => {
    setResolving(true)
    try {
      await resolveConflict(current, keep)
      if (index + 1 < conflicts.length) {
        setIndex(index + 1)
      } else {
        onResolved()
      }
    } catch (err) {
      console.error('Failed to resolve conflict:', err)
    } finally {
      setResolving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="conflict-overlay"
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          key={`conflict-${index}`}
          className="bg-bg-card rounded-[24px] w-full max-w-sm overflow-hidden"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.96 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* Header */}
          <div
            className="px-5 pt-5 pb-4"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 60%, transparent 100%)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-bold text-amber-900/70 uppercase tracking-[2px]">
                  Conflict
                </div>
                <div className="text-[22px] font-black text-amber-950 tracking-tight mt-0.5">
                  {emoji} {local.name || server.name}
                </div>
              </div>
              <div className="bg-amber-900/15 px-3 py-1 rounded-full text-[13px] font-bold text-amber-900">
                {index + 1} of {conflicts.length}
              </div>
            </div>
          </div>

          {/* Comparison */}
          <div className="px-5 py-4">
            <div className="flex gap-3">
              {/* Local column */}
              <div className="flex-1 bg-bg-input rounded-[20px] p-4">
                <div className="text-[11px] font-bold text-text-light uppercase tracking-[2px] mb-3">
                  Local
                </div>
                <div className="space-y-2.5">
                  <div>
                    <div className="text-[11px] text-text-light font-semibold">Name</div>
                    <div className="text-sm font-bold text-text truncate">{local.name}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-light font-semibold">Type</div>
                    <div className="text-sm font-bold text-text">
                      {DRINK_EMOJI[local.drinkType]} {DRINK_LABELS[local.drinkType]}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-light font-semibold">Rating</div>
                    <div className="text-amber-500"><Stars rating={local.rating} /></div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-light font-semibold">Updated</div>
                    <div className="text-xs font-semibold text-text-muted">
                      {formatDate(local.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Server column */}
              <div className="flex-1 bg-bg-input rounded-[20px] p-4">
                <div className="text-[11px] font-bold text-text-light uppercase tracking-[2px] mb-3">
                  Server
                </div>
                <div className="space-y-2.5">
                  <div>
                    <div className="text-[11px] text-text-light font-semibold">Name</div>
                    <div className="text-sm font-bold text-text truncate">{server.name}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-light font-semibold">Type</div>
                    <div className="text-sm font-bold text-text">
                      {DRINK_EMOJI[server.drinkType]} {DRINK_LABELS[server.drinkType]}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-light font-semibold">Rating</div>
                    <div className="text-amber-500"><Stars rating={server.rating} /></div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-light font-semibold">Updated</div>
                    <div className="text-xs font-semibold text-text-muted">
                      {formatDate(server.updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Deleted indicator */}
            {server.deletedAt && (
              <div className="mt-3 px-4 py-2 rounded-xl bg-[#c62828]/10 text-[#c62828] text-xs font-bold text-center">
                Server version was deleted
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex gap-3">
            <button
              onClick={() => handleResolve('local')}
              disabled={resolving}
              className="flex-1 py-3.5 rounded-[20px] bg-bg-input text-text text-sm font-bold border-none cursor-pointer disabled:opacity-40 transition-all active:scale-[0.97]"
            >
              Keep Local
            </button>
            <button
              onClick={() => handleResolve('server')}
              disabled={resolving}
              className="flex-1 py-3.5 rounded-[20px] text-white text-sm font-bold border-none cursor-pointer disabled:opacity-40 transition-all active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
              }}
            >
              Keep Server
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
