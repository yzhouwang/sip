import type { DrinkType } from './db'

export const DRINK_COLORS: Record<DrinkType, { bg: string; text: string; card: string }> = {
  wine: { bg: 'bg-wine-bg', text: 'text-wine', card: 'bg-wine' },
  whisky: { bg: 'bg-whisky-bg', text: 'text-whisky', card: 'bg-whisky' },
  beer: { bg: 'bg-beer-bg', text: 'text-beer', card: 'bg-beer' },
  sake: { bg: 'bg-sake-bg', text: 'text-sake', card: 'bg-sake' },
  cocktail: { bg: 'bg-cocktail-bg', text: 'text-cocktail', card: 'bg-cocktail' },
  other: { bg: 'bg-other-bg', text: 'text-other', card: 'bg-other' },
}

// Raw hex values for canvas/SVG use
export const DRINK_HEX: Record<DrinkType, string> = {
  wine: '#d81b60',
  whisky: '#e65100',
  beer: '#f9a825',
  sake: '#00acc1',
  cocktail: '#5c6bc0',
  other: '#66bb6a',
}

export const FLAVOR_COLORS: Record<string, string> = {
  smoky: '#e65100',
  earthy: '#558b2f',
  briny: '#00838f',
  sweet: '#f9a825',
  floral: '#d81b60',
  citrus: '#ff9800',
  spicy: '#c62828',
  fruity: '#ad1457',
  rich: '#4e342e',
  bitter: '#f57f17',
  umami: '#6d4c41',
  herbal: '#2e7d32',
  nutty: '#8d6e63',
  oaky: '#795548',
  crisp: '#0097a7',
}

export const RATING_LABELS = ['', 'Nope', 'Meh', 'Solid', 'Great', 'All-timer']

// Header gradient per drink filter (Izakaya Menu Board direction)
// Uses var(--color-bg) so gradient endpoint auto-resolves in dark mode
export const HEADER_GRADIENTS: Record<string, string> = {
  all: 'linear-gradient(135deg, #e65100 0%, #ff8f00 40%, var(--color-bg) 100%)',
  wine: 'linear-gradient(135deg, #d81b60 0%, #e91e63 40%, var(--color-bg) 100%)',
  whisky: 'linear-gradient(135deg, #e65100 0%, #ff8f00 40%, var(--color-bg) 100%)',
  beer: 'linear-gradient(135deg, #f57f17 0%, #f9a825 40%, var(--color-bg) 100%)',
  sake: 'linear-gradient(135deg, #00838f 0%, #00acc1 40%, var(--color-bg) 100%)',
  cocktail: 'linear-gradient(135deg, #3949ab 0%, #5c6bc0 40%, var(--color-bg) 100%)',
  other: 'linear-gradient(135deg, #388e3c 0%, #66bb6a 40%, var(--color-bg) 100%)',
  map: 'linear-gradient(135deg, #00695c 0%, #00acc1 40%, var(--color-bg) 100%)',
}

export const STATUS_LABELS: Record<string, string> = {
  tasted: 'Tasted',
  wishlist: 'Wishlist',
  cellar: 'Cellar',
}
