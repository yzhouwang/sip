import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { db, DRINK_TYPES, DRINK_LABELS, DRINK_EMOJI, type DrinkType } from '../lib/db'
import { DrinkCard } from '../components/DrinkCard'

const FILTER_COLORS: Record<string, string> = {
  all: '',
  wine: 'bg-wine-bg text-wine',
  whisky: 'bg-whisky-bg text-whisky',
  beer: 'bg-beer-bg text-beer',
  sake: 'bg-sake-bg text-sake',
  cocktail: 'bg-cocktail-bg text-cocktail',
  other: 'bg-other-bg text-other',
}

function SkeletonCard({ wide }: { wide?: boolean }) {
  return (
    <div
      className={`rounded-3xl overflow-hidden ${wide ? 'col-span-2 min-h-[160px]' : 'min-h-[190px]'} bg-bg-input animate-pulse`}
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

  // undefined = still loading, array = loaded
  const isLoading = tastings === undefined
  const count = tastings?.length ?? 0
  const hasFilters = filter !== 'all' || search.trim().length > 0
  const featured = tastings?.[0]
  const rest = tastings?.slice(1) ?? []

  return (
    <motion.div
      className="pb-24 px-4"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="pt-5 pb-1 flex items-end justify-between">
        <div>
          <h1 className="text-[44px] font-black tracking-tighter font-display leading-none">
            Sip.
          </h1>
          <div className="mt-2.5 inline-flex items-center gap-1.5 bg-text text-white px-3.5 py-1.5 rounded-full text-[13px] font-semibold">
            🍶 {isLoading ? '...' : `${count} tasting${count !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-10 h-10 rounded-xl bg-bg-input flex items-center justify-center text-lg border-none cursor-pointer"
          >
            🔍
          </button>
          <button
            onClick={() => setSort(sort === 'date' ? 'rating' : 'date')}
            className="h-10 px-3 rounded-xl bg-bg-input flex items-center justify-center text-xs font-bold text-text-muted border-none cursor-pointer"
          >
            {sort === 'date' ? '↓ Date' : '↓ Rating'}
          </button>
        </div>
      </div>

      {/* Search */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
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

      {/* Filter tabs */}
      <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setFilter('all')}
          className={`px-5 py-2.5 rounded-[28px] text-sm font-bold whitespace-nowrap border-none cursor-pointer transition-all ${
            filter === 'all'
              ? 'bg-text text-white scale-105'
              : 'bg-white text-text-muted border border-border'
          }`}
        >
          All
        </button>
        {DRINK_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(filter === type ? 'all' : type)}
            className={`px-5 py-2.5 rounded-[28px] text-sm font-bold whitespace-nowrap border-none cursor-pointer transition-all ${
              filter === type
                ? 'bg-text text-white scale-105'
                : FILTER_COLORS[type]
            }`}
          >
            {DRINK_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Cards */}
      {isLoading ? (
        /* Skeleton loading state */
        <div className="grid grid-cols-2 gap-3 mt-3">
          <SkeletonCard wide />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : count === 0 && !hasFilters ? (
        /* True empty state — no tastings at all */
        <div className="mt-20 text-center">
          <div className="text-6xl mb-4">🥂</div>
          <div className="text-xl font-bold text-text">Log your first sip</div>
          <div className="text-sm text-text-muted mt-2">
            Tap the + button to record a tasting
          </div>
          <button
            onClick={() => navigate('/new')}
            className="mt-6 px-8 py-3 bg-text text-white rounded-2xl text-base font-bold border-none cursor-pointer"
          >
            + Add Tasting
          </button>
        </div>
      ) : count === 0 && hasFilters ? (
        /* Filtered-empty state — filters active but no matches */
        <div className="mt-16 text-center">
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
        <motion.div layout className="grid grid-cols-2 gap-3 mt-3">
          <AnimatePresence>
            {featured && (
              <DrinkCard
                key={featured.id}
                tasting={featured}
                featured
                onClick={() => navigate(`/tasting/${featured.id}`)}
              />
            )}
            {rest.map((t) => (
              <DrinkCard
                key={t.id}
                tasting={t}
                onClick={() => navigate(`/tasting/${t.id}`)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* FAB */}
      <motion.button
        whileHover={{ rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/new')}
        className="fixed bottom-24 right-[max(1rem,calc((100vw-430px)/2+1rem))] w-16 h-16 rounded-[22px] bg-text text-white text-3xl font-light border-none cursor-pointer shadow-lg flex items-center justify-center z-40"
      >
        +
      </motion.button>
    </motion.div>
  )
}
