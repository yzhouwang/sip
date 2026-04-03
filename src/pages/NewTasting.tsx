import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { db, DRINK_TYPES, DRINK_LABELS, FLAVORS, type DrinkType, type FlavorId } from '../lib/db'
import { DRINK_COLORS, RATING_LABELS } from '../lib/theme'
import { compressPhoto } from '../lib/photos'
import { createTasting, updateTasting } from '../lib/tastings'

const FLAVOR_SELECTED_COLORS: Record<string, string> = {
  smoky: 'bg-whisky text-white',
  earthy: 'bg-other text-white',
  briny: 'bg-sake text-white',
  sweet: 'bg-beer text-text',
  floral: 'bg-wine text-white',
  citrus: 'bg-[#ff9800] text-white',
  spicy: 'bg-[#c62828] text-white',
  fruity: 'bg-wine text-white',
  rich: 'bg-[#4e342e] text-white',
  bitter: 'bg-beer text-text',
  umami: 'bg-[#6d4c41] text-white',
  herbal: 'bg-[#2e7d32] text-white',
  nutty: 'bg-[#8d6e63] text-white',
  oaky: 'bg-[#795548] text-white',
  crisp: 'bg-sake text-white',
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

export function NewTasting() {
  const navigate = useNavigate()
  const { id } = useParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasInitialized = useRef(false)

  // Track previous photoPreview URL for cleanup
  const prevPhotoUrl = useRef<string | undefined>(undefined)

  const existing = useLiveQuery(async () => {
    if (!id) return null
    return db.tastings.get(id)
  }, [id])

  const [drinkType, setDrinkType] = useState<DrinkType>('whisky')
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [flavors, setFlavors] = useState<FlavorId[]>([])
  const [notes, setNotes] = useState('')
  const [location, setLocation] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string>()
  const [photoBlob, setPhotoBlob] = useState<Blob>()
  const [thumbBlob, setThumbBlob] = useState<Blob>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [photoError, setPhotoError] = useState<string>()

  // Initialize form state from existing tasting — only once
  useEffect(() => {
    if (!existing || hasInitialized.current) return
    hasInitialized.current = true
    setDrinkType(existing.drinkType)
    setName(existing.name)
    setRating(existing.rating)
    setFlavors(existing.flavors)
    setNotes(existing.notes)
    setLocation(existing.location)
    if (existing.photoThumb) {
      const url = URL.createObjectURL(existing.photoThumb)
      prevPhotoUrl.current = url
      setPhotoPreview(url)
    }
  }, [existing])

  // Cleanup Object URLs on unmount
  useEffect(() => {
    return () => {
      if (prevPhotoUrl.current) {
        URL.revokeObjectURL(prevPhotoUrl.current)
      }
    }
  }, [])

  const toggleFlavor = (f: FlavorId) => {
    if (flavors.includes(f)) {
      setFlavors(flavors.filter((x) => x !== f))
    } else if (flavors.length < 5) {
      setFlavors([...flavors, f])
    }
  }

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError(undefined)
    try {
      const { photo, thumb } = await compressPhoto(file)
      setPhotoBlob(photo)
      setThumbBlob(thumb)
      // Revoke old URL before creating new one
      if (prevPhotoUrl.current) {
        URL.revokeObjectURL(prevPhotoUrl.current)
      }
      const url = URL.createObjectURL(thumb)
      prevPhotoUrl.current = url
      setPhotoPreview(url)
    } catch {
      setPhotoError('Photo failed. Tap to retry.')
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !rating) return
    setSaving(true)
    setError(undefined)
    try {
      const input = {
        drinkType,
        name: name.trim(),
        rating,
        flavors,
        notes: notes.trim(),
        location: location.trim(),
        ...(photoBlob ? { photo: photoBlob, photoThumb: thumbBlob } : {}),
      }
      if (id && existing) {
        await updateTasting(id, input)
      } else {
        await createTasting(input)
      }
      navigate(-1)
    } catch (err) {
      console.error('Save failed:', err)
      setError('Save failed. Tap Save to retry.')
      setSaving(false)
    }
  }

  // Show loading gate when editing an existing tasting
  if (id && existing === undefined) {
    return (
      <div className="pb-8 px-4">
        <div className="pt-4 pb-2 flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-text-muted font-semibold bg-transparent border-none cursor-pointer"
          >
            ← Back
          </button>
          <span className="text-lg font-extrabold text-text">Edit Tasting</span>
          <div className="w-16" />
        </div>
        <div className="mt-2 h-44 rounded-[28px] bg-bg-input animate-pulse" />
        <div className="mt-5 h-12 rounded-[20px] bg-bg-input animate-pulse" />
        <div className="mt-5 h-12 rounded-[20px] bg-bg-input animate-pulse" />
      </div>
    )
  }

  return (
    <motion.div
      className="pb-8 px-5"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="pt-5 pb-4 flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-text-muted font-semibold bg-transparent border-none cursor-pointer"
        >
          ← Back
        </button>
        <span className="text-lg font-extrabold text-text">
          {id ? 'Edit Tasting' : 'New Tasting'}
        </span>
        <button
          onClick={handleSave}
          disabled={!name.trim() || !rating || saving}
          className="bg-text text-white px-5 py-2 rounded-[22px] text-sm font-bold border-none cursor-pointer disabled:opacity-40"
        >
          {saving ? '...' : 'Save'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-2 px-4 py-3 rounded-2xl bg-[#c62828]/10 text-[#c62828] text-sm font-bold text-center">
          {error}
        </div>
      )}

      {/* Photo */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`mt-3 h-36 rounded-[28px] border-[3px] border-dashed ${
          photoError ? 'border-[#c62828]/40 bg-[#c62828]/5' : 'border-border bg-white'
        } flex flex-col items-center justify-center cursor-pointer overflow-hidden relative`}
      >
        {photoPreview ? (
          <img src={photoPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : photoError ? (
          <>
            <div className="text-4xl mb-1 opacity-60">⚠️</div>
            <div className="text-sm text-[#c62828] font-semibold">{photoError}</div>
          </>
        ) : (
          <>
            <div className="text-5xl mb-1 opacity-60">📸</div>
            <div className="text-sm text-text-light font-semibold">Tap to snap</div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoto}
          className="hidden"
        />
      </div>

      {/* Drink type */}
      <div className="flex gap-2.5 mt-6 flex-wrap">
        {DRINK_TYPES.map((type) => {
          const selected = drinkType === type
          const colors = DRINK_COLORS[type]
          return (
            <motion.button
              key={type}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDrinkType(type)}
              className={`px-5 py-3 rounded-[20px] text-sm font-extrabold tracking-tight border-none cursor-pointer transition-all ${
                selected
                  ? `${colors.card} text-white shadow-md scale-108`
                  : `${colors.bg} ${colors.text}`
              }`}
            >
              {DRINK_LABELS[type]}
            </motion.button>
          )
        })}
      </div>

      {/* Name */}
      <div className="mt-7">
        <label className="text-xs text-text-light uppercase tracking-[2px] font-bold">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What are you drinking?"
          className="w-full mt-2 px-5 py-4 bg-bg-input border-none rounded-[20px] text-2xl font-black tracking-tight text-text placeholder:text-text-light outline-none font-sans"
        />
      </div>

      {/* Rating */}
      <div className="mt-6">
        <label className="text-xs text-text-light uppercase tracking-[2px] font-bold">
          Rating {rating > 0 && <span className="normal-case tracking-normal text-text-muted">· {RATING_LABELS[rating]}</span>}
        </label>
        <div className="flex gap-2.5 mt-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <motion.button
              key={n}
              whileTap={{ scale: 0.9 }}
              onClick={() => setRating(n)}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-extrabold border-none cursor-pointer transition-all ${
                n <= rating ? 'bg-text text-white scale-110' : 'bg-bg-input text-text-light'
              }`}
            >
              {n}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Flavors */}
      <div className="mt-7">
        <label className="text-xs text-text-light uppercase tracking-[2px] font-bold">
          Flavors <span className="normal-case tracking-normal text-text-muted">· {flavors.length}/5</span>
        </label>
        <div className="flex gap-2.5 flex-wrap mt-2">
          {FLAVORS.map((f) => {
            const selected = flavors.includes(f.id)
            const disabled = !selected && flavors.length >= 5
            return (
              <motion.button
                key={f.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => !disabled && toggleFlavor(f.id)}
                className={`px-4 py-2.5 rounded-[18px] text-[13px] font-bold border-none cursor-pointer transition-all ${
                  selected
                    ? `${FLAVOR_SELECTED_COLORS[f.id]} scale-105`
                    : disabled
                      ? 'bg-bg-input text-text-light/50 cursor-not-allowed'
                      : 'bg-bg-input text-text-muted'
                }`}
              >
                {f.emoji} {f.label}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-7">
        <label className="text-xs text-text-light uppercase tracking-[2px] font-bold">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you taste? How did it feel?"
          rows={3}
          className="w-full mt-2 px-5 py-4 bg-bg-input border-none rounded-[20px] text-[15px] font-medium text-text placeholder:text-text-light outline-none resize-none font-sans leading-relaxed"
        />
      </div>

      {/* Location */}
      <div className="mt-6">
        <label className="text-xs text-text-light uppercase tracking-[2px] font-bold">
          Location
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Where are you?"
          className="w-full mt-2 px-5 py-3.5 bg-bg-input border-none rounded-[20px] text-sm font-semibold text-text placeholder:text-text-light outline-none font-sans"
        />
      </div>
    </motion.div>
  )
}
