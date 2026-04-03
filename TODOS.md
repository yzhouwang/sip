# Sip — Deferred Items

Items deferred during Phase 1 and Phase 2 reviews. Prioritized by user impact.

## Phase 3 (Next)

### Multi-User Auth
- Registration, login, JWT sessions, per-user data scoping
- Prerequisite: HTTPS must be working (Phase 2A)
- Changes product from personal tool to sharable product
- Effort: L-XL (CC: ~2 hours)

## Future

### AI Label Recognition
- Use vision API to auto-fill drink name/type from photo of bottle label
- External API dependency (OpenAI, Claude, or Google Vision)
- Requires HTTPS for API key security
- Effort: L (CC: ~1 hour)

### Export Streaming for 500+ Tastings
- Current JSON export loads all tastings + photos into memory
- Streaming approach needed when user accumulates hundreds of tastings
- Defer until user actually has that many (premature optimization)
- Effort: M (CC: ~30 min)

### Reverse Geocoding
- Convert existing text-only locations to lat/lng coordinates
- Requires external geocoding API (Google Maps, Mapbox, Nominatim)
- Would populate Map pins for tastings logged before Phase 2
- Effort: M (CC: ~30 min)

### Leaflet Marker Clustering
- Install leaflet.markercluster plugin
- Group nearby pins when zoomed out
- Only needed at 200+ geo-tagged tastings
- Effort: S (CC: ~15 min)

### Dark Mode FAB Shadow
- Test FAB pulse shadow visibility in dark mode
- May need increased opacity (0.4 → 0.6) for dark backgrounds
- Effort: XS (CC: ~5 min)

### Card Overlay Badge Animation
- Subtle scale-in animation for wishlist/cellar badges on first render
- Nice-to-have polish
- Effort: XS (CC: ~5 min)

### Lazy Thumbnail Loading
- Defer until performance data shows need
- Collection page loads all thumbnails eagerly
- At 100+ tastings, may need intersection observer
- Effort: S (CC: ~15 min)

### Import-then-Sync Interaction
- Test what happens when user imports backup then pushes
- Beyond burst debounce test scope
- Effort: S (CC: ~15 min)

### Offline Map Tiles
- Cache Leaflet tiles for offline viewing
- Requires service worker tile caching strategy
- Effort: M (CC: ~30 min)
