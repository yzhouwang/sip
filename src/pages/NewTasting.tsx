import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { db, DRINK_TYPES, DRINK_LABELS, FLAVORS, type DrinkType, type FlavorId } from '../lib/db'
import { DRINK_COLORS } from '../lib/theme'
import { RATING_LABELS } from '../lib/theme'
import { compressPhoto } from '../lib/photos'

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

export function NewTasting() {
  const navigate = useNavigate()
  const { id } = useParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const existing = useLiveQuery(async () => {
    if (!id) return null
    return db.tastings.get(id)
  }, [id])

  const [drinkType, setDrinkType] = useState<DrinkType>(existing?.drinkType ?? 'whisky')
  const [name, setName] = useState(existing?.name ?? '')
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [flavors, setFlavors] = useState<FlavorId[]>(existing?.flavors ?? [])
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [location, setLocation] = useState(existing?.location ?? '')
  const [photoPreview, setPhotoPreview] = useState<string>()
  const [photoBlob, setPhotoBlob] = useState<Blob>()
  const [thumbBlob, setThumbBlob] = useState<Blob>()
  const [saving, setSaving] = useState(false)

  // Sync state when existing data loads
  useLiveQuery(async () => {
    if (!existing) return
    setDrinkType(existing.drinkType)
    setName(existing.name)
    setRating(existing.rating)
    setFlavors(existing.flavors)
    setNotes(existing.notes)
    setLocation(existing.location)
    if (existing.photoThumb) {
      setPhotoPreview(URL.createObjectURL(existing.photoThumb))
    }
  }, [existing?.id])

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
    try {
      const { photo, thumb } = await compressPhoto(file)
      setPhotoBlob(photo)
      setThumbBlob(thumb)
      setPhotoPreview(URL.createObjectURL(thumb))
    } catch {
      // Skip photo gracefully on failure
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !rating) return
    setSaving(true)
    try {
      const now = new Date()
      if (id && existing) {
        await db.tastings.update(id, {
          drinkType,
          name: name.trim(),
          rating,
          flavors,
          notes: notes.trim(),
          location: location.trim(),
          ...(photoBlob ? { photo: photoBlob, photoThumb: thumbBlob } : {}),
          updatedAt: now,
        })
      } else {
        await db.tastings.add({
          id: crypto.randomUUID(),
          drinkType,
          name: name.trim(),
          rating,
          photo: photoBlob,
          photoThumb: thumbBlob,
          flavors,
          notes: notes.trim(),
          location: location.trim(),
          createdAt: now,
          updatedAt: now,
        })
      }
      navigate(-1)
    } catch (err) {
      console.error('Save failed:', err)
      setSaving(false)
    }
  }

  return (
    <div className="pb-8 px-4">
      {/* Header */}
      <div className="pt-4 pb-2 flex justify-between items-center">
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

      {/* Photo */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="mt-2 h-44 rounded-[28px] border-[3px] border-dashed border-border bg-white flex flex-col items-center justify-center cursor-pointer overflow-hidden relative"
      >
        {photoPreview ? (
          <img src={photoPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
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
      <div className="flex gap-2 mt-4 flex-wrap">
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
      <div className="mt-5">
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
      <div className="mt-5">
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
      <div className="mt-5">
        <label className="text-xs text-text-light uppercase tracking-[2px] font-bold">
          Flavors <span className="normal-case tracking-normal text-text-muted">· {flavors.length}/5</span>
        </label>
        <div className="flex gap-2 flex-wrap mt-2">
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
      <div className="mt-5">
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
      <div className="mt-4">
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
    </div>
  )
}
