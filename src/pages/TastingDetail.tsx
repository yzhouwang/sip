import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, DRINK_EMOJI, DRINK_LABELS, FLAVORS } from '../lib/db'
import { DRINK_COLORS, RATING_LABELS } from '../lib/theme'

export function TastingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [photoUrl, setPhotoUrl] = useState<string>()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const tasting = useLiveQuery(async () => {
    if (!id) return null
    return db.tastings.get(id)
  }, [id])

  useEffect(() => {
    if (tasting?.photo) {
      const url = URL.createObjectURL(tasting.photo)
      setPhotoUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [tasting?.photo])

  if (tasting === undefined) {
    return <div className="p-8 text-center text-text-muted">Loading...</div>
  }
  if (!tasting) {
    return <div className="p-8 text-center text-text-muted">Tasting not found</div>
  }

  const colors = DRINK_COLORS[tasting.drinkType]
  const isLightText = tasting.drinkType !== 'beer'

  const handleDelete = async () => {
    await db.tastings.delete(tasting.id)
    navigate('/')
  }

  return (
    <div className="pb-8">
      {/* Hero */}
      <div className={`${colors.card} min-h-[280px] relative flex flex-col`}>
        {photoUrl ? (
          <img src={photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="flex-1 flex items-center justify-center text-8xl opacity-30">
            {DRINK_EMOJI[tasting.drinkType]}
          </div>
        )}
        <div className={`absolute inset-0 ${photoUrl ? 'bg-gradient-to-t from-black/60 via-transparent' : ''}`} />

        {/* Top bar */}
        <div className="relative z-10 flex justify-between items-center p-4">
          <button
            onClick={() => navigate(-1)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border-none cursor-pointer ${
              photoUrl ? 'bg-black/30 text-white' : isLightText ? 'bg-white/20 text-white' : 'bg-black/10 text-text'
            }`}
          >
            ← Back
          </button>
          <button
            onClick={() => navigate(`/edit/${tasting.id}`)}
            className={`px-4 py-1.5 rounded-xl text-sm font-bold border-none cursor-pointer ${
              photoUrl ? 'bg-white text-text' : isLightText ? 'bg-white/20 text-white' : 'bg-black/10 text-text'
            }`}
          >
            Edit
          </button>
        </div>

        {/* Title overlay */}
        <div className={`relative z-10 mt-auto p-5 ${photoUrl ? 'text-white' : isLightText ? 'text-white' : 'text-text'}`}>
          <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
            photoUrl ? 'bg-white/20' : isLightText ? 'bg-white/25' : 'bg-black/10'
          }`}>
            {DRINK_LABELS[tasting.drinkType]}
          </span>
          <h1 className="text-3xl font-black tracking-tight mt-1">{tasting.name}</h1>
        </div>
      </div>

      {/* Details */}
      <div className="px-5 pt-5">
        {/* Rating */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold ${
                  n <= tasting.rating ? 'bg-text text-white' : 'bg-bg-input text-text-light'
                }`}
              >
                {n}
              </div>
            ))}
          </div>
          <span className="text-sm font-bold text-text-muted">{RATING_LABELS[tasting.rating]}</span>
        </div>

        {/* Flavors */}
        {tasting.flavors.length > 0 && (
          <div className="mt-5">
            <label className="text-xs text-text-light uppercase tracking-[2px] font-bold">
              Flavors
            </label>
            <div className="flex gap-2 flex-wrap mt-2">
              {tasting.flavors.map((fid) => {
                const flavor = FLAVORS.find((f) => f.id === fid)
                return flavor ? (
                  <span
                    key={fid}
                    className={`px-4 py-2 rounded-[18px] text-[13px] font-bold ${colors.bg} ${colors.text}`}
                  >
                    {flavor.emoji} {flavor.label}
                  </span>
                ) : null
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        {tasting.notes && (
          <div className="mt-5">
            <label className="text-xs text-text-light uppercase tracking-[2px] font-bold">
              Notes
            </label>
            <p className="mt-2 text-[15px] leading-relaxed text-text/80">{tasting.notes}</p>
          </div>
        )}

        {/* Location & Date */}
        <div className="mt-5 flex gap-4 text-sm text-text-muted">
          {tasting.location && <span>📍 {tasting.location}</span>}
          <span>
            📅{' '}
            {tasting.createdAt.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        {/* Delete */}
        <div className="mt-10 pt-5 border-t border-border">
          {showDeleteConfirm ? (
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-2xl bg-[#c62828] text-white text-sm font-bold border-none cursor-pointer"
              >
                Yes, delete this tasting
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-2xl bg-bg-input text-text-muted text-sm font-bold border-none cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 rounded-2xl bg-bg-input text-text-muted text-sm font-semibold border-none cursor-pointer"
            >
              Delete this tasting
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
