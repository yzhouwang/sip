import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { db, FLAVORS, DRINK_TYPES, DRINK_LABELS } from '../lib/db'
import { FLAVOR_COLORS, DRINK_HEX } from '../lib/theme'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

function RadarChart({ data }: { data: { label: string; emoji: string; value: number }[] }) {
  if (data.length < 3) return null

  const cx = 150
  const cy = 150
  const r = 110
  const levels = 3

  const angleStep = (2 * Math.PI) / data.length
  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2
    return {
      x: cx + r * value * Math.cos(angle),
      y: cy + r * value * Math.sin(angle),
    }
  }

  const ringPoints = (level: number) =>
    data
      .map((_, i) => {
        const p = getPoint(i, (level + 1) / levels)
        return `${p.x},${p.y}`
      })
      .join(' ')

  const dataPoints = data.map((d, i) => {
    const p = getPoint(i, d.value)
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <svg viewBox="0 0 300 300" className="w-[280px] h-[280px] mx-auto my-5">
      <defs>
        <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d81b60" stopOpacity="0.25" />
          <stop offset="50%" stopColor="#e65100" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#00acc1" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* Rings */}
      {Array.from({ length: levels }).map((_, l) => (
        <polygon
          key={l}
          points={ringPoints(l)}
          fill="none"
          stroke="#e8e4dc"
          strokeWidth="1.5"
        />
      ))}

      {/* Data shape */}
      <polygon
        points={dataPoints}
        fill="url(#radarFill)"
        stroke="#d81b60"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Dots and labels */}
      {data.map((d, i) => {
        const p = getPoint(i, d.value)
        const lp = getPoint(i, 1.18)
        return (
          <g key={d.label}>
            <circle cx={p.x} cy={p.y} r="5" fill="#d81b60" stroke="#fefcf8" strokeWidth="2" />
            <text
              x={lp.x}
              y={lp.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[11px] font-bold fill-text-muted"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {d.emoji} {d.label.toUpperCase()}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function TasteDNA() {
  const tastings = useLiveQuery(() => db.tastings.toArray())

  if (!tastings) return null

  const total = tastings.length

  // Aggregate flavor counts
  const flavorCounts: Record<string, number> = {}
  for (const t of tastings) {
    for (const f of t.flavors) {
      flavorCounts[f] = (flavorCounts[f] || 0) + 1
    }
  }

  // All flavors sorted by count
  const allFlavors = FLAVORS.map((f) => ({
    ...f,
    count: flavorCounts[f.id] || 0,
    pct: total > 0 ? Math.round(((flavorCounts[f.id] || 0) / total) * 100) : 0,
  })).sort((a, b) => b.count - a.count)

  // Top 6 for radar
  const top6 = allFlavors.slice(0, 6)
  const maxPct = Math.max(...top6.map((f) => f.pct), 1)

  // Category breakdown
  const catCounts: Record<string, number> = {}
  for (const t of tastings) {
    catCounts[t.drinkType] = (catCounts[t.drinkType] || 0) + 1
  }
  const categories = DRINK_TYPES.map((type) => ({
    type,
    label: DRINK_LABELS[type],
    count: catCounts[type] || 0,
  }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)

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
        className="px-5 pt-6 pb-5"
        style={{ background: 'linear-gradient(135deg, #d81b60 0%, #e65100 30%, #ff8f00 60%, #fefcf8 100%)' }}
      >
        <h1 className="text-[36px] font-black tracking-tighter font-display leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
          Taste DNA
        </h1>
        <div className="mt-4">
          <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-[13px] font-semibold text-white">
            🧬 {total} tasting{total !== 1 ? 's' : ''} · {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
          </div>
        </div>
      </div>

      {total < 5 ? (
        <div className="mt-16 text-center relative px-5">
          <div className="font-display text-[160px] font-black text-whisky opacity-[0.04] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none leading-none">
            味
          </div>
          <div className="relative z-10">
            <div className="w-36 h-36 rounded-full mx-auto flex items-center justify-center"
              style={{ background: 'radial-gradient(circle, #e0e4f8 0%, transparent 70%)' }}>
              <span className="text-6xl">🧬</span>
            </div>
            <div className="text-2xl font-black font-display tracking-tight text-text mt-4">
              Build your palate
            </div>
            <div className="text-sm text-text-muted mt-2 leading-relaxed">
              Log 5+ tastings to unlock<br/>your flavor fingerprint.
            </div>
          </div>
        </div>
      ) : (
        <div className="px-5">
          {/* Radar chart */}
          <RadarChart
            data={top6.map((f) => ({
              label: f.label,
              emoji: f.emoji,
              value: f.pct / maxPct,
            }))}
          />

          {/* Flavor bars */}
          <div className="mt-2">
            <h3 className="text-xs text-text-light uppercase tracking-[2px] font-bold mb-4">
              Your Top Flavors
            </h3>
            {allFlavors
              .filter((f) => f.count > 0)
              .map((f) => (
                <div key={f.id} className="mb-3.5">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-extrabold text-text">
                      {f.emoji} {f.label}
                    </span>
                    <span className="text-sm font-extrabold text-text-muted">{f.pct}%</span>
                  </div>
                  <div className="h-3 bg-bg-input rounded-md overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all duration-500"
                      style={{
                        width: `${f.pct}%`,
                        backgroundColor: FLAVOR_COLORS[f.id] || '#999',
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>

          {/* Category breakdown */}
          <div className="mt-6">
            <h3 className="text-xs text-text-light uppercase tracking-[2px] font-bold mb-4">
              By Category
            </h3>
            <div className="bg-bg-card rounded-3xl overflow-hidden">
              {categories.map((c, i) => (
                <div
                  key={c.type}
                  className={`flex items-center gap-3.5 px-5 py-3.5 ${i < categories.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <div
                    className="w-4 h-4 rounded-md"
                    style={{ backgroundColor: DRINK_HEX[c.type] }}
                  />
                  <span className="text-sm font-semibold text-text/70 flex-1">{c.label}</span>
                  <span className="text-base font-black text-text">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
