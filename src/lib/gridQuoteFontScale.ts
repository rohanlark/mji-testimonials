import type { QuoteFontScaleOverride } from '../types/testimonial';

/**
 * Auto (cell-based) font scale by layout span. Matches sidebar tier values where possible.
 * @see QuoteFontScaleOverride numeric options (S … XL).
 */
export const GRID_CELL_FONT_SCALE_MAP: Record<string, number> = {
  '1x1': 0.85,
  '1x2': 0.92,
  '1x3': 0.96,
  '1x4': 1.0,
  '2x1': 0.92,
  '2x2': 1.0,
  '2x3': 1.0,
  '2x4': 1.0,
  '3x1': 1.0,
  '3x2': 0.97,
  '3x3': 1.0,
  '3x4': 1.0,
  '4x1': 1.0,
  '4x2': 0.97,
  '4x3': 1.0,
  '4x4': 1.0,
};

/** Canonical scale anchors for S, SM, M, ML, L, XL (matches manual override values). */
const TIER_SCALES = [0.8, 0.9, 1, 1.1, 1.2, 1.4] as const;

/**
 * Unitless line-height per tier: S/SM stay open (~1.5); M→XL tighten; XL = 1.2.
 * Auto cell scales snap to the nearest tier for line-height.
 */
const TIER_LINE_HEIGHTS = [1.5, 1.5, 1.425, 1.35, 1.275, 1.2] as const;

export function lineHeightForQuoteScale(scale: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < TIER_SCALES.length; i++) {
    const d = Math.abs(scale - TIER_SCALES[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return TIER_LINE_HEIGHTS[best];
}

export function effectiveQuoteScale(
  colSpan: number,
  rowSpan: number,
  override: QuoteFontScaleOverride | undefined
): number {
  if (override !== undefined && override !== 'auto') {
    return override;
  }
  const key = `${colSpan}x${rowSpan}`;
  return GRID_CELL_FONT_SCALE_MAP[key] ?? 1;
}
