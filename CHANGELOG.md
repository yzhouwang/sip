# Changelog

All notable changes to Sip will be documented in this file.

## [1.2.0.2] - 2026-04-04

### Fixed
- Sync: validate all server DTOs before writing to IndexedDB (prevents corrupt data from untrusted server)
- Sync: add 30s/60s fetch timeouts via AbortController (prevents hung requests)
- Sync: retry individual failed pushes on next flush instead of dropping them
- Config: block HTTP connections to private/RFC-1918 IP addresses (SSRF prevention)
- Settings: whitelist image MIME types in base64ToBlob (only jpeg/png/webp)
- Settings: reset file input on import validation failure (allows re-selecting same file)
- Settings: guard push/pull with isSyncConfigured() for multi-tab safety
- NewTasting: reset saving state before navigating on successful save

## [1.2.0.1] - 2026-04-04

### Changed
- New Tasting page: increased section spacing, corrected side margins to 20px (DESIGN.md spec), reduced photo area height, wider gaps between form sections
- Settings page: taller gradient header, more space between Cloud Backup and Local Backup sections
- Collection page: resized CTA button (larger padding, smaller text), compacted filter pills, scaled down empty state text hierarchy

## [1.2.0.0] - 2026-04-03

### Changed
- Taste DNA page: gradient header (wine-to-amber), status badge with tasting count, Japanese watermark (味) empty state with "Build your palate" copy, category breakdown in white card with dividers
- Settings page: indigo gradient header, status badge showing sync state, gradient CTA buttons for cloud backup, white card styling with soft shadows for backup options
- Fixed header badge deriving sync state from React state instead of localStorage (prevents stale display)
