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

const FONT_SCALE_SEQUENCE: QuoteFontScaleOverride[] = QUOTE_FONT_SCALE_OPTIONS.map((o) => o.value);

/** Step scale with wrap (e.g. XL → Auto, Auto ↓ → XL). */
export function stepQuoteFontScale(
  current: QuoteFontScaleOverride,
  direction: -1 | 1
): QuoteFontScaleOverride {
  const i = Math.max(0, FONT_SCALE_SEQUENCE.indexOf(current));
  const n = FONT_SCALE_SEQUENCE.length;
  const j = (((i + direction) % n) + n) % n;
  return FONT_SCALE_SEQUENCE[j];
}
