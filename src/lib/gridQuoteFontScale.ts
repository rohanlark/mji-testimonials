/** Canonical scale anchors for S, SM, M, ML, L, XL (matches manual override values). */
const TIER_SCALES = [0.8, 0.9, 1, 1.1, 1.2, 1.4] as const;

/**
 * Unitless line-height per tier: S/SM stay open (~1.5); M→XL tighten; XL = 1.2.
 */
const TIER_LINE_HEIGHTS = [1.5, 1.5, 1.425, 1.35, 1.275, 1.2] as const;

export function lineHeightForQuoteScale(scale: number): number {
  if (scale > 1.4) {
    // Above XL, gradually tighten line-height but keep a readable floor.
    return Math.max(1.05, 1.2 - (scale - 1.4) * 0.08);
  }
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
