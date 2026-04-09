import { Testimonial, GridSizeOverride } from '../types/testimonial';
import { normalizeQuoteForLayout } from './quoteNormalize';

export interface GridPlacement {
  testimonial: Testimonial;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  gridRow: string;
  gridColumn: string;
}

/**
 * Character-based sizing: width variety (1-4 columns), height capped at 2 rows.
 * - <100 chars: 1x1
 * - 100-200: 2x1 or 1x2
 * - 200-350: 3x1 or 2x2
 * - 350-500: 3x2 or 4x1
 * - 500+: 4x2
 * CRITICAL: rowSpan never exceeds 2; colSpan up to 4.
 */
function calculateCellSize(quote: string): { rowSpan: number; colSpan: number } {
  const charCount = normalizeQuoteForLayout(quote).length;
  let rowSpan: number;
  let colSpan: number;

  if (charCount < 100) {
    rowSpan = 1;
    colSpan = 1;
  } else if (charCount < 200) {
    rowSpan = 1;
    colSpan = 2; // 1x2 or 2x1 → prefer wider (1x2)
  } else if (charCount < 350) {
    rowSpan = 2;
    colSpan = 2; // 3x1 or 2x2 → use 2x2
  } else if (charCount < 500) {
    rowSpan = 2;
    colSpan = 3; // 3x2 or 4x1 → use 3x2
  } else {
    rowSpan = 2;
    colSpan = 4; // 4x2
  }

  rowSpan = Math.min(rowSpan, 2);
  colSpan = Math.min(colSpan, 4);
  return { rowSpan, colSpan };
}

/** Parse override string "2x1" -> { colSpan: 2, rowSpan: 1 }. Columns and rows 1–4. */
function parseSizeOverride(override: GridSizeOverride): { rowSpan: number; colSpan: number } | null {
  if (override === 'auto') return null;
  const [colStr, rowStr] = override.split('x').map(Number);
  if (!Number.isInteger(colStr) || !Number.isInteger(rowStr)) return null;
  const colSpan = Math.min(Math.max(1, colStr), 4);
  const rowSpan = Math.min(Math.max(1, rowStr), 4);
  return { rowSpan, colSpan };
}

/**
 * Checks if a cell can be placed at the given position (horizontal bound only).
 * Rows are not capped here: the layout grid auto-grows (`calculateGridRows`); `maxRows` from
 * settings is a template hint and per-item clamp, not a hard packing ceiling — capping rows
 * here caused first-fit to skip rows where fallback had already placed items, leaving holes
 * (e.g. 1×1 and 2×1 not sharing a row when they fit side by side).
 */
function canPlace(
  grid: (number | null)[][],
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number,
  maxCols: number
): boolean {
  if (col + colSpan > maxCols) {
    return false;
  }

  for (let r = row; r < row + rowSpan; r++) {
    while (grid.length <= r) {
      grid.push(new Array(maxCols).fill(null));
    }
    for (let c = col; c < col + colSpan; c++) {
      if (grid[r][c] !== null) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Places a cell in the grid
 */
function placeCell(
  grid: (number | null)[][],
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number,
  index: number,
  maxCols: number
): void {
  // Extend grid rows if needed
  while (grid.length < row + rowSpan) {
    grid.push(new Array(maxCols).fill(null));
  }
  
  // Mark cells as occupied
  for (let r = row; r < row + rowSpan; r++) {
    for (let c = col; c < col + colSpan; c++) {
      grid[r][c] = index;
    }
  }
}

/**
 * Finds the first available position (row-major first-fit).
 * Scans through all rows that already exist in `grid` plus one new row at `grid.length` when
 * needed, so items pack next to earlier placements instead of only searching the first
 * `maxRows` rows (which missed tail rows created by overflow/fallback).
 */
function findPlacement(
  grid: (number | null)[][],
  rowSpan: number,
  colSpan: number,
  maxCols: number,
  maxRows: number
): { row: number; col: number } | null {
  const rowMax = Math.max(maxRows - rowSpan, grid.length);
  for (let row = 0; row <= rowMax; row++) {
    for (let col = 0; col <= maxCols - colSpan; col++) {
      if (canPlace(grid, row, col, rowSpan, colSpan, maxCols)) {
        return { row, col };
      }
    }
  }
  return null;
}

/**
 * Calculates grid layout in **packing order** (testimonials array order): each item is placed
 * first-fit (row-major scan). Visual reading order may differ from array order — UI should
 * list quotes with `sortPlacementsReadingOrder` so the sidebar matches left→right, top→bottom.
 * Some hole patterns can still appear with awkward sizes/order; reordering or resizing usually helps.
 */
export function calculateGridLayout(
  testimonials: Testimonial[],
  maxCols: number = 4,
  overrides?: Record<string, GridSizeOverride>,
  maxRows: number = 4
): GridPlacement[] {
  if (testimonials.length === 0) {
    return [];
  }

  // Place in list order so grid visual order (L>R, T>B) matches sidebar list order.
  // Character length (or override) still determines each item's cell size.
  const grid: (number | null)[][] = [];
  const placements: GridPlacement[] = [];

  for (let index = 0; index < testimonials.length; index++) {
    const testimonial = testimonials[index];
    const override = overrides?.[testimonial.id];
    const parsed = override ? parseSizeOverride(override) : null;
    const rawSize = parsed ?? calculateCellSize(testimonial.quote);
    const rowSpan = Math.min(rawSize.rowSpan, maxRows);
    const colSpan = Math.min(rawSize.colSpan, maxCols);

    const position = findPlacement(grid, rowSpan, colSpan, maxCols, maxRows);

    if (position) {
      placeCell(grid, position.row, position.col, rowSpan, colSpan, index, maxCols);

      const gridRow = rowSpan > 1
        ? `${position.row + 1} / span ${rowSpan}`
        : `${position.row + 1}`;
      const gridColumn = colSpan > 1
        ? `${position.col + 1} / span ${colSpan}`
        : `${position.col + 1}`;

      placements.push({
        testimonial,
        row: position.row,
        col: position.col,
        rowSpan,
        colSpan,
        gridRow,
        gridColumn,
      });
    } else {
      const fallbackRow = grid.length;
      placeCell(grid, fallbackRow, 0, rowSpan, colSpan, index, maxCols);

      placements.push({
        testimonial,
        row: fallbackRow,
        col: 0,
        rowSpan,
        colSpan,
        gridRow: fallbackRow + 1 + (rowSpan > 1 ? ` / span ${rowSpan}` : ''),
        gridColumn: `1 / span ${colSpan}`,
      });
    }
  }

  return placements;
}

/**
 * Calculates the number of rows needed for the grid
 */
export function calculateGridRows(placements: GridPlacement[]): number {
  if (placements.length === 0) return 0;
  
  let maxRow = 0;
  for (const placement of placements) {
    const endRow = placement.row + placement.rowSpan;
    if (endRow > maxRow) {
      maxRow = endRow;
    }
  }
  
  return maxRow;
}

/** Reading order: top → bottom, left → right (matches how users scan the bento). */
export function sortPlacementsReadingOrder(placements: GridPlacement[]): GridPlacement[] {
  return [...placements].sort((a, b) =>
    a.row !== b.row ? a.row - b.row : a.col - b.col
  );
}

/**
 * Counts empty 1×1 cells inside the occupied row range. Holes appear when first-fit
 * placement cannot tessellate arbitrary rectangles (footprints differ); reordering or
 * resizing cells usually reduces gaps.
 */
export function countVacantUnitCells(
  placements: GridPlacement[],
  maxCols: number
): number {
  if (placements.length === 0) return 0;
  const rowCount = calculateGridRows(placements);
  const occupied = new Set<string>();
  for (const p of placements) {
    for (let r = p.row; r < p.row + p.rowSpan; r++) {
      for (let c = p.col; c < p.col + p.colSpan; c++) {
        occupied.add(`${r},${c}`);
      }
    }
  }
  let vacant = 0;
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < maxCols; c++) {
      if (!occupied.has(`${r},${c}`)) vacant++;
    }
  }
  return vacant;
}
