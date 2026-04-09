import { GridDimensions, GridSizeOverride } from '../types/testimonial';

export type GridResizeAxis = 'e' | 's' | 'se';

export function spansToGridOverride(colSpan: number, rowSpan: number): GridSizeOverride {
  return `${colSpan}x${rowSpan}` as GridSizeOverride;
}

/** Column step (track + gap) and row step from current grid DOM geometry. */
export function readGridResizeSteps(
  gridEl: HTMLElement,
  columns: number,
  packingRowCount: number
): { colStep: number; rowStep: number } {
  const style = getComputedStyle(gridEl);
  const gapX = parseFloat(style.columnGap || style.gap) || 0;
  const gapY = parseFloat(style.rowGap || style.gap) || 0;
  const gapPx = Number.isFinite(gapX) && gapX > 0 ? gapX : Number.isFinite(gapY) && gapY > 0 ? gapY : 16;
  const rect = gridEl.getBoundingClientRect();
  const cols = Math.max(1, columns);
  const rows = Math.max(1, packingRowCount);

  const colTrack =
    cols > 0 ? (rect.width - gapPx * Math.max(0, cols - 1)) / cols : rect.width;
  const colStep = (Number.isFinite(colTrack) ? colTrack : 80) + gapPx;

  const rowTrack =
    rows > 0 ? (rect.height - gapPx * Math.max(0, rows - 1)) / rows : rect.height;
  const rowStep = (Number.isFinite(rowTrack) ? rowTrack : 48) + gapPx;

  return { colStep, rowStep };
}

export function computeSpannedCellsFromPointerDelta(options: {
  axis: GridResizeAxis;
  deltaX: number;
  deltaY: number;
  startColSpan: number;
  startRowSpan: number;
  colStep: number;
  rowStep: number;
  dimensions: GridDimensions;
}): { colSpan: number; rowSpan: number } {
  const {
    axis,
    deltaX,
    deltaY,
    startColSpan,
    startRowSpan,
    colStep,
    rowStep,
    dimensions,
  } = options;

  const colDelta = axis === 's' ? 0 : Math.round(deltaX / Math.max(colStep, 1));
  const rowDelta = axis === 'e' ? 0 : Math.round(deltaY / Math.max(rowStep, 1));

  const colSpan = Math.min(
    dimensions.columns,
    Math.max(1, startColSpan + colDelta)
  );
  const rowSpan = Math.min(dimensions.rows, Math.max(1, startRowSpan + rowDelta));

  return { colSpan, rowSpan };
}
