export const GRADIENT = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'

export const GRADIENT_TEXT = {
  background: GRADIENT,
  WebkitBackgroundClip: 'text' as const,
  WebkitTextFillColor: 'transparent' as const,
  backgroundClip: 'text' as const,
}

export const BRAND_COLORS = {
  indigo: '#6366f1',
  purple: '#8b5cf6',
} as const
