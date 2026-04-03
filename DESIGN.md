# Design System — Sip

## Product Context
- **What this is:** Universal tasting notes PWA for logging any drink
- **Who it's for:** Drink enthusiasts who taste across categories (wine, whisky, beer, sake, cocktails)
- **Space/industry:** Drink logging / tasting notes (competes with Vivino, Untappd, but universal)
- **Project type:** Mobile-first PWA

## Aesthetic Direction
- **Direction:** Izakaya Menu Board — warm, bold, Japanese-inspired
- **Decoration level:** Intentional — gradient headers, Japanese watermark in empty state, subtle texture through color
- **Mood:** Walking into a dimly lit Tokyo bar with a beautifully hand-lettered menu. Bold color, warm light, confident choices. Not polished-corporate, not scrappy-indie. Feels like someone with taste made this.
- **Reference sites:** Vivino (card grid), Untappd (social feed), but deliberately different — universal, not single-category

## Typography
- **Display/Hero:** Noto Sans JP 900 — Japanese-inspired weight for the brand identity
- **Body:** Space Grotesk 500 — geometric, clean, modern but warm
- **UI/Labels:** Space Grotesk 700, 11px uppercase with 2px tracking
- **Data/Tables:** Space Grotesk (tabular-nums)
- **Code:** Not needed
- **Loading:** Google Fonts CDN (preconnect)
- **Scale:** Hero 36px, Heading 28px, Subheading 22px, Body 15px, Small 13px, Label 11px

## Color
- **Approach:** Expressive — each drink category owns a bold saturated hue
- **Accent:** #e65100 (warm whisky orange) — FAB, CTAs, gradient headers
- **Background:** #fefcf8 (warm cream)
- **Surface:** #ffffff (cards, inputs on white), #f4f0e8 (inputs on cream)
- **Text:** #1a1a1a (primary), #999999 (muted), #888888 (light)
- **Border:** #e8e4dc
- **Drink colors:**
  - Wine: #d81b60 / bg #ffe0ea
  - Whisky: #e65100 / bg #ffe0b2
  - Beer: #f9a825 / bg #fff8d0
  - Sake: #00acc1 / bg #d0f4f8
  - Cocktail: #5c6bc0 / bg #e0e4f8
  - Other: #66bb6a / bg #dcedc8
- **Semantic:** success #2e7d32, warning #f57f17, error #c62828, info #1565c0

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable
- **Scale:** 4(2xs) 8(xs) 12(sm) 16(md) 20(lg) 24(xl) 32(2xl) 48(3xl) 64(4xl)
- **Side margins:** 20px (px-5) everywhere — not 16px
- **Section gaps:** 16px between major sections (header bands, card grid)

## Layout
- **Approach:** Creative-editorial — asymmetric card grids, gradient bleeds, not rigid columns
- **Header:** 3 distinct horizontal bands:
  1. Gradient strip (amber→cream, shifts hue per active drink filter) with "Sip." title + count
  2. Filter pills row with 20px inset + right fade hint
  3. (Search bar, when visible)
- **Card grid:**
  - Featured card: full-width, 240px min-height, drink name in 28px overlapping the photo area
  - Regular cards: asymmetric rows alternating 60/40 and 40/60 splits (not even halves)
  - 12px gap between cards
- **Max content width:** 430px
- **Border radius:** sm:12px (buttons), md:20px (inputs), lg:24px (cards), xl:28px (hero cards), full:9999px (pills, badges)

## Header Gradient
- **Default (All filter):** linear-gradient(135deg, #e65100 0%, #ff8f00 40%, var(--bg) 100%)
- **Wine selected:** linear-gradient(135deg, #d81b60 0%, #e91e63 40%, var(--bg) 100%)
- **Whisky selected:** linear-gradient(135deg, #e65100 0%, #ff8f00 40%, var(--bg) 100%)
- **Beer selected:** linear-gradient(135deg, #f57f17 0%, #f9a825 40%, var(--bg) 100%)
- **Sake selected:** linear-gradient(135deg, #00838f 0%, #00acc1 40%, var(--bg) 100%)
- **Cocktail selected:** linear-gradient(135deg, #3949ab 0%, #5c6bc0 40%, var(--bg) 100%)
- **Other selected:** linear-gradient(135deg, #388e3c 0%, #66bb6a 40%, var(--bg) 100%)
- Title "Sip." renders white on gradient, text-shadow: 0 2px 8px rgba(0,0,0,0.15)
- Count badge: rgba(255,255,255,0.2) backdrop-blur background

## Empty State
- Japanese watermark character 酒 (sake/alcohol) at 160px, 4% opacity, centered behind content
- Warm gradient circle behind emoji (not flat void)
- CTA button uses gradient accent (not black): linear-gradient(135deg, #e65100, #ff8f00)
- Button shadow: 0 6px 24px rgba(230,81,0,0.35)
- Copy: "Log your first sip" / "Every great bottle deserves a story."

## FAB
- Shape: Circle, 56px diameter
- Color: linear-gradient(135deg, #e65100, #ff8f00)
- Icon: 🍶 emoji (not generic +)
- Shadow: 0 6px 24px rgba(230,81,0,0.4)
- Animation: Gentle pulse on box-shadow (3s ease-in-out infinite)

## Filter Pills
- **Unselected:** drink's light background color + dark text (e.g., #ffe0ea bg, #d81b60 text)
- **Selected:** drink's full saturated color as background, white text, scale(1.05)
- **"All" selected:** #1a1a1a bg, white text
- Horizontal scroll with right fade gradient hint (48px wide, bg→transparent)

## Bottom Navigation
- **Icons:** SVG stroke icons (not Unicode glyphs)
  - Collection: 4-square grid
  - DNA: Star/diamond
  - Settings: Gear
- **Touch targets:** 48px minimum
- **Active indicator:** 24px × 2px bar above active tab
- **Active:** stroke var(--text), label var(--text)
- **Inactive:** stroke var(--text-light), label var(--text-light)

## Motion
- **Approach:** Intentional
- **Page transitions:** opacity + y-translate (12px), 200ms
- **Card hover:** scale(1.02) + rotate(-0.5deg)
- **Card tap:** scale(0.98)
- **FAB:** Gentle pulse animation on shadow (3s ease-in-out)
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-03 | Izakaya Menu Board direction | User wanted wilder than the safe spacing fix. Dynamic gradients + asymmetric cards + Japanese watermarks chosen over Stamp Collection and Vertical Pour. |
| 2026-04-03 | Asymmetric card rows (60/40) | Breaking the rigid 50/50 grid creates visual energy and editorial feel |
| 2026-04-03 | Header gradient shifts per drink filter | Makes the filter selection feel immersive, not just a tab change |
| 2026-04-03 | 酒 watermark in empty state | Japanese cultural reference that fits the product's aesthetic without being decorative noise |
| 2026-04-03 | Sake cup emoji FAB | Ties the add button to the product identity instead of generic + |
| 2026-04-03 | 20px side margins (up from 16px) | 44px→36px title + 20px margins gives better proportional breathing room on 375px screens |
| 2026-04-03 | Gradient headers on all pages | DNA gets wine→amber gradient, Settings gets indigo gradient. Consistent with Collection. |
| 2026-04-03 | 味 watermark in DNA empty state | "Flavor" kanji mirrors 酒 watermark in Collection empty state |
| 2026-04-03 | Status badges in all headers | Backdrop-blur pills showing page-relevant stats (tasting count, sync status) |
| 2026-04-04 | Crowdedness polish pass | Increased section spacing on New Tasting (mt-5→mt-7), Settings (taller header, wider section gaps), Collection (compacted filter pills, rebalanced CTA button proportions) |
