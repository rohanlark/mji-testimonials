import { GridDimensions, GridSizeOverride } from '../types/testimonial';

/** Handle position: edges grow/shrink span along that direction; corners adjust both. */
export type GridResizeAxis = 'n' | 'e' | 's' | 'w' | 'nw' | 'ne' | 'se' | 'sw';

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

function axisColRowDeltas(axis: GridResizeAxis, deltaX: number, deltaY: number, colStep: number, rowStep: number) {
  const cx = Math.max(colStep, 1);
  const ry = Math.max(rowStep, 1);

  let colDelta = 0;
  let rowDelta = 0;

  switch (axis) {
    case 'e':
      colDelta = Math.round(deltaX / cx);
      break;
    case 'w':
      colDelta = Math.round(-deltaX / cx);
      break;
    case 's':
      rowDelta = Math.round(deltaY / ry);
      break;
    case 'n':
      rowDelta = Math.round(-deltaY / ry);
      break;
    case 'se':
      colDelta = Math.round(deltaX / cx);
      rowDelta = Math.round(deltaY / ry);
      break;
    case 'sw':
      colDelta = Math.round(-deltaX / cx);
      rowDelta = Math.round(deltaY / ry);
      break;
    case 'ne':
      colDelta = Math.round(deltaX / cx);
      rowDelta = Math.round(-deltaY / ry);
      break;
    case 'nw':
      colDelta = Math.round(-deltaX / cx);
      rowDelta = Math.round(-deltaY / ry);
      break;
  }

  return { colDelta, rowDelta };
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

  const { colDelta, rowDelta } = axisColRowDeltas(axis, deltaX, deltaY, colStep, rowStep);

  const colSpan = Math.min(
    dimensions.columns,
    Math.max(1, startColSpan + colDelta)
  );
  const rowSpan = Math.min(dimensions.rows, Math.max(1, startRowSpan + rowDelta));

  return { colSpan, rowSpan };
}
