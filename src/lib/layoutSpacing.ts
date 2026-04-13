/** Space between cards in grid and stack layouts (CSS `gap`). */
export const DEFAULT_LAYOUT_GAP_PX = 16;

/** Inset around the whole grid/stack block inside the preview (padding on the layout wrapper). */
export const DEFAULT_LAYOUT_MARGIN_PX = 0;

/** Padding inside each card surface, before quote and metadata (matches `styleConfig.grid.cell`). */
export const DEFAULT_CARD_PADDING_PX = 24;

export const LAYOUT_GAP_BOUNDS = { min: 0, max: 64, step: 2 } as const;
export const CARD_PADDING_BOUNDS = { min: 8, max: 64, step: 2 } as const;

type Bounds = { min: number; max: number; step: number };

/**
 * Step a pixel value by one step in `direction`, clamped to bounds and snapped to the step grid.
 */
export function stepLayoutPx(current: number, direction: -1 | 1, bounds: Bounds): number {
  const raw = current + direction * bounds.step;
  const clamped = Math.min(bounds.max, Math.max(bounds.min, raw));
  const snapped = Math.round(clamped / bounds.step) * bounds.step;
  return Math.min(bounds.max, Math.max(bounds.min, snapped));
}
