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

type ManualQuoteFontScale = Exclude<QuoteFontScaleOverride, 'auto'>;

/** ± only moves among fixed scales; `auto` is left via the picker, not by stepping. */
export const MANUAL_FONT_SCALE_SEQUENCE: ManualQuoteFontScale[] = [0.8, 0.9, 1, 1.1, 1.2, 1.4];

/**
 * Step type scale among manual tiers only (no wrap).
 * From `auto`, the first ± treats the card as medium (1) and steps to the neighbour tier,
 * so manual adjustment never cycles through `auto`.
 */
export function stepQuoteFontScale(
  current: QuoteFontScaleOverride,
  direction: -1 | 1
): QuoteFontScaleOverride {
  const baselineIndex = MANUAL_FONT_SCALE_SEQUENCE.indexOf(1);
  const i0 =
    current === 'auto'
      ? baselineIndex
      : MANUAL_FONT_SCALE_SEQUENCE.indexOf(current as ManualQuoteFontScale);
  const i = i0 === -1 ? baselineIndex : i0;
  const n = MANUAL_FONT_SCALE_SEQUENCE.length;

  if (current === 'auto') {
    const j = i + direction;
    return MANUAL_FONT_SCALE_SEQUENCE[Math.max(0, Math.min(n - 1, j))];
  }

  const j = i + direction;
  return MANUAL_FONT_SCALE_SEQUENCE[Math.max(0, Math.min(n - 1, j))];
}
