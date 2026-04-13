import type { QuoteFontScaleOverride } from '../types/testimonial';

/** Options for per-quote type scale (grid + stack), shown on-card and anywhere else. */
export const QUOTE_FONT_SCALE_OPTIONS: { value: QuoteFontScaleOverride; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 0.8, label: 'S' },
  { value: 0.9, label: 'SM' },
  { value: 1, label: 'M' },
  { value: 1.1, label: 'ML' },
  { value: 1.2, label: 'L' },
  { value: 1.4, label: 'XL' },
];

export const MIN_FONT_SCALE = 0.8;
export const MAX_FONT_SCALE = 4;
export const FONT_SCALE_STEP = 0.1;
export const DEFAULT_GLOBAL_QUOTE_FONT_SCALE = 1;

export function clampQuoteFontScale(value: number): number {
  return Number(Math.max(MIN_FONT_SCALE, Math.min(MAX_FONT_SCALE, value)).toFixed(1));
}

/**
 * Step type scale with linear increments (no wrap).
 * From `auto`, the first ± treats the card as medium (1) and steps to the neighbour tier,
 * so manual adjustment never cycles through `auto`.
 */
export function stepQuoteFontScale(
  current: QuoteFontScaleOverride,
  direction: -1 | 1,
  baseScale: number = DEFAULT_GLOBAL_QUOTE_FONT_SCALE
): QuoteFontScaleOverride {
  const base = current === 'auto' ? clampQuoteFontScale(baseScale) : current;
  const raw = base + direction * FONT_SCALE_STEP;
  return clampQuoteFontScale(raw);
}
