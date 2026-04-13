/**
 * Auto quote sizing: fills the flex quote slot (minus metadata) using the real
 * wrapped text height, not a static span → scale map.
 */
export const AUTO_FIT_LINE_HEIGHT = 1.3;

const MIN_PX = 12;
const MAX_PX = 200;
const FIT_ITERATIONS = 24;

/**
 * Width-led target for auto font. This decouples chosen type size from transient
 * stretched row height and prevents stale-tall feedback loops in equal-height rows.
 */
const MAX_FONT_TO_CELL_WIDTH = 0.34;

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

  const maxByWidth = Math.max(MIN_PX, Math.min(MAX_PX, areaWidth * MAX_FONT_TO_CELL_WIDTH));
  textEl.style.fontSize = `${maxByWidth}px`;

  // In normal cases we keep the deterministic width-led size.
  // Only if vertical space is genuinely constrained do we solve by height.
  if (textEl.scrollHeight <= areaHeight + 0.5) {
    textEl.style.fontSize = prev.fontSize;
    textEl.style.lineHeight = prev.lineHeight;
    textEl.style.width = prev.width;
    const rounded = Math.round(maxByWidth * 4) / 4;
    return Math.max(MIN_PX, Math.min(MAX_PX, rounded));
  }

  let lo = MIN_PX;
  let hi = maxByWidth;

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
