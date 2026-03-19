/* ═══════════════════════════════════════════════════════════════
   chartTheme — shared Recharts configuration for all charts
   ═══════════════════════════════════════════════════════════════ */

export const CHART_COLORS = {
  primary: '#D4AF37',
  secondary: '#CC5500',
  success: '#34D399',
  danger: '#F87171',
  grid: 'rgba(245, 245, 220, 0.04)',
  axis: 'rgba(245, 245, 220, 0.25)',
  tooltip: {
    bg: 'rgba(18, 20, 24, 0.90)',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#F5F5DC',
  },
} as const;

export const AXIS_STYLE = {
  fontSize: 11,
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fill: 'rgba(245, 245, 220, 0.3)',
} as const;

export const GRID_STYLE = {
  strokeDasharray: '3 6',
  stroke: 'rgba(245, 245, 220, 0.04)',
} as const;

/** Standard gradient stops for gold area fills */
export const GOLD_GRADIENT = {
  start: { stopColor: '#D4AF37', stopOpacity: 0.6 },
  end: { stopColor: '#D4AF37', stopOpacity: 0 },
} as const;

/** Standard gradient stops for secondary area fills */
export const SECONDARY_GRADIENT = {
  start: { stopColor: '#CC5500', stopOpacity: 0.4 },
  end: { stopColor: '#CC5500', stopOpacity: 0 },
} as const;
