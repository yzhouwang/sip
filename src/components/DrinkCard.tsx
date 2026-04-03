import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Tasting } from '../lib/db'
import { DRINK_EMOJI, DRINK_LABELS } from '../lib/db'
import { DRINK_COLORS, DRINK_HEX } from '../lib/theme'

function RatingDots({ rating, light }: { rating: number; light?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i <= rating
              ? light
                ? 'bg-white'
                : 'bg-text'
              : light
                ? 'bg-white/30'
                : 'bg-border'
          }`}
        />
      ))}
    </div>
  )
}

/** Status overlay badge (wishlist = bookmark, cellar = lock) */
function StatusBadge({ status, drinkType }: { status: string; drinkType: string }) {
  if (status === 'tasted') return null
  const color = DRINK_HEX[drinkType as keyof typeof DRINK_HEX] || '#666'
  return (
    <div
      className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center z-10"
      style={{ backgroundColor: color, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
    >
      {status === 'wishlist' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/>
        </svg>
      )}
    </div>
  )
}

export function DrinkCard({
  tasting,
  featured,
  onClick,
}: {
  tasting: Tasting
  featured?: boolean
  onClick: () => void
}) {
  const [thumbUrl, setThumbUrl] = useState<string>()
  const colors = DRINK_COLORS[tasting.drinkType]
  const isLightText = tasting.drinkType !== 'beer'

  useEffect(() => {
    if (tasting.photoThumb) {
      const url = URL.createObjectURL(tasting.photoThumb)
      setThumbUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [tasting.photoThumb])

  if (featured) {
    return (
      <motion.div
        layout
        whileHover={{ scale: 1.02, rotate: -0.5 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`${colors.card} rounded-[28px] overflow-hidden cursor-pointer flex min-h-[240px] relative`}
      >
        <StatusBadge status={tasting.status || 'tasted'} drinkType={tasting.drinkType} />
        <div className="w-[45%] flex items-center justify-center text-[100px] opacity-15 relative">
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            DRINK_EMOJI[tasting.drinkType]
          )}
        </div>
        <div className={`flex-1 p-6 flex flex-col justify-center ${isLightText ? 'text-white' : 'text-text'}`}>
          <span className={`inline-block self-start px-3 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${isLightText ? 'bg-white/25' : 'bg-black/10'}`}>
            {DRINK_LABELS[tasting.drinkType]}
          </span>
          <div className="text-[28px] font-black tracking-tight mt-2 leading-tight">{tasting.name}</div>
          {tasting.location && (
            <div className="text-[13px] opacity-70 mt-1">{tasting.location}</div>
          )}
          <div className="mt-auto pt-3 flex items-center gap-2.5">
            <RatingDots rating={tasting.rating} light={isLightText} />
            <span className="text-[11px] opacity-60">
              {tasting.createdAt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
            </span>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02, rotate: -0.5 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`${colors.card} rounded-3xl overflow-hidden cursor-pointer p-4 min-h-[180px] flex flex-col relative`}
    >
      <StatusBadge status={tasting.status || 'tasted'} drinkType={tasting.drinkType} />
      <div className="text-[36px] opacity-40 relative">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            className="absolute -top-4 -left-4 -right-4 h-24 object-cover rounded-xl opacity-60"
          />
        ) : (
          DRINK_EMOJI[tasting.drinkType]
        )}
      </div>
      <div className={`text-[16px] font-extrabold mt-2 tracking-tight ${isLightText ? 'text-white' : 'text-text'}`}>
        {tasting.name}
      </div>
      {tasting.location && (
        <div className={`text-[11px] mt-0.5 ${isLightText ? 'text-white/70' : 'text-text/70'}`}>
          {tasting.location}
        </div>
      )}
      <div className="mt-auto pt-2.5 flex items-center gap-2">
        <RatingDots rating={tasting.rating} light={isLightText} />
      </div>
    </motion.div>
  )
}
