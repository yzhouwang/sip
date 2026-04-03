import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { db, DRINK_TYPES, DRINK_LABELS, DRINK_EMOJI, type DrinkType } from '../lib/db'
import { DrinkCard } from '../components/DrinkCard'
import { HEADER_GRADIENTS } from '../lib/theme'

function SkeletonCard({ wide }: { wide?: boolean }) {
  return (
    <div
      className={`rounded-3xl overflow-hidden ${wide ? 'col-span-2 min-h-[240px]' : 'min-h-[180px]'} bg-bg-input animate-pulse`}
    />
  )
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

export function Collection() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<DrinkType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [sort, setSort] = useState<'date' | 'rating'>('date')

  const tastings = useLiveQuery(async () => {
    let collection = db.tastings.orderBy(sort === 'date' ? 'createdAt' : 'rating')
    if (sort === 'date' || sort === 'rating') {
      collection = collection.reverse()
    }
    let results = await collection.toArray()
    if (filter !== 'all') {
      results = results.filter((t) => t.drinkType === filter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      results = results.filter(
        (t) => t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q),
      )
    }
    return results
  }, [filter, search, sort])

  const isLoading = tastings === undefined
  const count = tastings?.length ?? 0
  const hasFilters = filter !== 'all' || search.trim().length > 0
  const featured = tastings?.[0]
  const rest = tastings?.slice(1) ?? []

  // Build asymmetric rows from remaining cards (alternating 60/40 and 40/60)
  const cardRows: Array<{ left: typeof rest[0]; right?: typeof rest[0]; leftFlex: number }> = []
  for (let i = 0; i < rest.length; i += 2) {
    const rowIndex = Math.floor(i / 2)
    cardRows.push({
      left: rest[i],
      right: rest[i + 1],
      leftFlex: rowIndex % 2 === 0 ? 6 : 4,
    })
  }

  return (
    <motion.div
      className="pb-24"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2 }}
    >
      {/* Gradient Header */}
      <div
        className="px-5 pb-3 pt-5 flex items-end justify-between transition-all duration-500"
        style={{ background: HEADER_GRADIENTS[filter] }}
      >
        <div>
          <h1 className="text-[36px] font-black tracking-tighter font-display leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
            Sip.
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-none cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          <button
            onClick={() => setSort(sort === 'date' ? 'rating' : 'date')}
            className="h-10 px-3 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xs font-bold text-white border-none cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="M3 6h18M3 12h12M3 18h6"/>
            </svg>
            {sort === 'date' ? 'Date' : 'Rating'}
          </button>
        </div>
      </div>

      {/* Count badge */}
      <div className="px-5 mt-3">
        <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-[13px] font-semibold"
          style={{ background: 'rgba(26,26,26,0.9)', color: 'white' }}>
          🍶 {isLoading ? '...' : `${count} tasting${count !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Search */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5"
          >
            <input
              type="text"
              placeholder="Search by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full mt-3 px-5 py-3.5 bg-bg-input border-none rounded-2xl text-base font-semibold text-text placeholder:text-text-light outline-none font-sans"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter pills */}
      <div className="relative mt-4">
        <div className="flex gap-2 overflow-x-auto pb-1 px-5 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setFilter('all')}
            className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap border-none cursor-pointer transition-all flex-shrink-0 ${
              filter === 'all'
                ? 'bg-text text-white scale-105'
                : 'bg-white text-text-muted'
            }`}
          >
            All
          </button>
          {DRINK_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(filter === type ? 'all' : type)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap border-none cursor-pointer transition-all flex-shrink-0 ${
                filter === type
                  ? `bg-${type} text-white scale-105`
                  : `bg-${type}-bg text-${type}`
              }`}
            >
              {DRINK_LABELS[type]}
            </button>
          ))}
        </div>
        {/* Fade hint */}
        <div className="absolute right-0 top-0 bottom-1 w-12 bg-gradient-to-l from-bg to-transparent pointer-events-none" />
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="px-5 mt-4 flex flex-col gap-3">
          <SkeletonCard wide />
          <div className="flex gap-3">
            <div className="flex-[6]"><SkeletonCard /></div>
            <div className="flex-[4]"><SkeletonCard /></div>
          </div>
        </div>
      ) : count === 0 && !hasFilters ? (
        /* Empty state with Japanese watermark */
        <div className="mt-16 text-center relative px-5">
          <div className="font-display text-[160px] font-black text-whisky opacity-[0.04] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none leading-none">
            酒
          </div>
          <div className="relative z-10">
            <div className="w-36 h-36 rounded-full bg-gradient-radial from-whisky-bg to-transparent mx-auto flex items-center justify-center"
              style={{ background: 'radial-gradient(circle, #ffe0b2 0%, transparent 70%)' }}>
              <span className="text-6xl">🥂</span>
            </div>
            <div className="text-2xl font-black font-display tracking-tight text-text mt-4">
              Log your first sip
            </div>
            <div className="text-sm text-text-muted mt-2 leading-relaxed">
              Every great bottle<br/>deserves a story.
            </div>
            <button
              onClick={() => navigate('/new')}
              className="mt-6 px-8 py-3.5 text-white rounded-[20px] text-base font-bold border-none cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #e65100, #ff8f00)',
                boxShadow: '0 6px 24px rgba(230, 81, 0, 0.35)',
              }}
            >
              + Add Tasting
            </button>
            <div className="text-xs text-text-light mt-3">Takes about 30 seconds</div>
          </div>
        </div>
      ) : count === 0 && hasFilters ? (
        /* Filtered-empty state */
        <div className="mt-16 text-center px-5">
          <div className="text-4xl mb-3 opacity-60">
            {filter !== 'all' ? DRINK_EMOJI[filter] : '🔍'}
          </div>
          <div className="text-base font-bold text-text-muted">
            {search.trim()
              ? `No matches for "${search.trim()}"`
              : `No ${filter !== 'all' ? DRINK_LABELS[filter].toLowerCase() : ''} tastings yet`}
          </div>
          <div className="text-sm text-text-light mt-1.5">
            {search.trim()
              ? 'Try a different search term'
              : 'Try a different filter or log one now'}
          </div>
        </div>
      ) : (
        <div className="px-5 mt-4 flex flex-col gap-3">
          <AnimatePresence>
            {/* Featured card — full width, tall */}
            {featured && (
              <DrinkCard
                key={featured.id}
                tasting={featured}
                featured
                onClick={() => navigate(`/tasting/${featured.id}`)}
              />
            )}
            {/* Asymmetric rows */}
            {cardRows.map((row) => (
              <div key={row.left.id} className="flex gap-3">
                <div style={{ flex: row.leftFlex }}>
                  <DrinkCard
                    tasting={row.left}
                    onClick={() => navigate(`/tasting/${row.left.id}`)}
                  />
                </div>
                {row.right && (
                  <div style={{ flex: 10 - row.leftFlex }}>
                    <DrinkCard
                      tasting={row.right}
                      onClick={() => navigate(`/tasting/${row.right!.id}`)}
                    />
                  </div>
                )}
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* FAB — sake cup emoji, gradient circle, pulse */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/new')}
        className="fixed bottom-24 right-[max(1.25rem,calc((100vw-430px)/2+1.25rem))] w-14 h-14 rounded-full text-2xl border-none cursor-pointer flex items-center justify-center z-40"
        style={{
          background: 'linear-gradient(135deg, #e65100, #ff8f00)',
          boxShadow: '0 6px 24px rgba(230, 81, 0, 0.4)',
          animation: 'fab-pulse 3s ease-in-out infinite',
        }}
      >
        🍶
      </motion.button>
    </motion.div>
  )
}
