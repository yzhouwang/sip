import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Tasting } from '../lib/db'
import { DRINK_EMOJI, DRINK_LABELS } from '../lib/db'
import { DRINK_COLORS } from '../lib/theme'

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
        className={`${colors.card} rounded-3xl overflow-hidden cursor-pointer col-span-2 flex min-h-[160px]`}
      >
        <div className="w-[45%] flex items-center justify-center text-6xl opacity-40 relative">
          {thumbUrl ? (
            <img src={thumbUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            DRINK_EMOJI[tasting.drinkType]
          )}
        </div>
        <div className={`flex-1 p-5 flex flex-col justify-center ${isLightText ? 'text-white' : 'text-text'}`}>
          <span className={`inline-block self-start px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${isLightText ? 'bg-white/25' : 'bg-black/10'}`}>
            {DRINK_LABELS[tasting.drinkType]}
          </span>
          <div className="text-[22px] font-black tracking-tight mt-1">{tasting.name}</div>
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
      className={`${colors.card} rounded-3xl overflow-hidden cursor-pointer p-4 min-h-[190px] flex flex-col`}
    >
      <div className="text-[40px] opacity-40 relative">
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
      <div className={`text-[17px] font-extrabold mt-2 tracking-tight ${isLightText ? 'text-white' : 'text-text'}`}>
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
