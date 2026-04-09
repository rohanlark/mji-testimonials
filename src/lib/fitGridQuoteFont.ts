/**
 * Auto quote sizing: fills the flex quote slot (minus metadata) using the real
 * wrapped text height, not a static span → scale map.
 */
export const AUTO_FIT_LINE_HEIGHT = 1.3;

const MIN_PX = 12;
const MAX_PX = 200;
const FIT_ITERATIONS = 24;

/**
 * Upper bound for auto font from column width alone. Grid items use align-stretch, so
 * `areaHeight` is often the full row height (driven by taller neighbors). If we only bound
 * the binary search by height, narrow cells keep an enormous vertical budget and the
 * chosen font stays huge when width shrinks. Capping by width ties type size to the
 * measure column (readable line length / density).
 */
const MAX_FONT_TO_CELL_WIDTH = 0.34;

/**
 * Loose upper bound from height for the search window (binary search still requires
 * scrollHeight <= areaHeight, so this only needs to exceed the true optimum).
 */
const HI_SLACK_FROM_HEIGHT = 1.12;

/**
 * Largest font-size (px) for which `textEl`'s laid-out content height fits in `areaHeight`,
 * at width `areaWidth` and the given unitless line-height multiplier.
 * Temporarily mutates `textEl` styles and restores them before returning.
 */
export function measureAutoQuoteFontSizePx(
  textEl: HTMLElement,
  areaWidth: number,
  areaHeight: number,
  lineHeightMult: number = AUTO_FIT_LINE_HEIGHT
): number {
  if (!Number.isFinite(areaWidth) || !Number.isFinite(areaHeight) || areaWidth < 2 || areaHeight < 2) {
    return MIN_PX;
  }

  const prev = {
    fontSize: textEl.style.fontSize,
    lineHeight: textEl.style.lineHeight,
    width: textEl.style.width,
  };

  const w = Math.max(0, Math.floor(areaWidth));
  textEl.style.width = `${w}px`;
  textEl.style.lineHeight = String(lineHeightMult);

  let lo = MIN_PX;
  const maxByWidth = areaWidth * MAX_FONT_TO_CELL_WIDTH;
  const maxByHeight = areaHeight * HI_SLACK_FROM_HEIGHT;
  let hi = Math.min(MAX_PX, maxByWidth, maxByHeight);
  hi = Math.max(hi, MIN_PX + 1);

  for (let i = 0; i < FIT_ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    textEl.style.fontSize = `${mid}px`;
    const fits = textEl.scrollHeight <= areaHeight + 0.5;
    if (fits) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  textEl.style.fontSize = prev.fontSize;
  textEl.style.lineHeight = prev.lineHeight;
  textEl.style.width = prev.width;

  const rounded = Math.round(lo * 4) / 4;
  return Math.max(MIN_PX, Math.min(MAX_PX, rounded));
}
