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
 * Character-based sizing candidates (ordered by visual preference first).
 * We keep multiple valid footprints so the packer can pick the one that
 * best reduces holes for the current partial layout.
 */
function calculateCellSizeCandidates(quote: string): Array<{ rowSpan: number; colSpan: number }> {
  const charCount = normalizeQuoteForLayout(quote).length;
  if (charCount < 100) {
    return [{ rowSpan: 1, colSpan: 1 }];
  }
  if (charCount < 200) {
    return [
      { rowSpan: 1, colSpan: 2 },
      { rowSpan: 2, colSpan: 1 },
    ];
  }
  if (charCount < 350) {
    return [
      { rowSpan: 2, colSpan: 2 },
      { rowSpan: 1, colSpan: 3 },
    ];
  }
  if (charCount < 500) {
    return [
      { rowSpan: 2, colSpan: 3 },
      { rowSpan: 1, colSpan: 4 },
    ];
  }
  return [{ rowSpan: 2, colSpan: 4 }];
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
    for (let c = col; c < col + colSpan; c++) {
      if (grid[r]?.[c] != null) {
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

function countProjectedVacancy(
  grid: (number | null)[][],
  maxCols: number,
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number
): { vacant: number; projectedRows: number } {
  const projectedRows = Math.max(grid.length, row + rowSpan);
  let vacant = 0;
  for (let r = 0; r < projectedRows; r++) {
    for (let c = 0; c < maxCols; c++) {
      const filledByCandidate =
        r >= row && r < row + rowSpan && c >= col && c < col + colSpan;
      const filledByGrid = grid[r]?.[c] != null;
      if (!filledByCandidate && !filledByGrid) vacant++;
    }
  }
  return { vacant, projectedRows };
}

/**
 * Finds a placement that minimizes holes and total row growth.
 * This keeps deterministic ordering but avoids many first-fit artefacts.
 */
function findPlacement(
  grid: (number | null)[][],
  rowSpan: number,
  colSpan: number,
  maxCols: number,
  maxRows: number
): { row: number; col: number } | null {
  const rowMax = Math.max(maxRows - rowSpan, grid.length);
  let best: { row: number; col: number; vacant: number; projectedRows: number } | null =
    null;

  for (let row = 0; row <= rowMax; row++) {
    for (let col = 0; col <= maxCols - colSpan; col++) {
      if (canPlace(grid, row, col, rowSpan, colSpan, maxCols)) {
        const score = countProjectedVacancy(grid, maxCols, row, col, rowSpan, colSpan);
        if (
          !best ||
          score.vacant < best.vacant ||
          (score.vacant === best.vacant && score.projectedRows < best.projectedRows) ||
          (score.vacant === best.vacant &&
            score.projectedRows === best.projectedRows &&
            row < best.row) ||
          (score.vacant === best.vacant &&
            score.projectedRows === best.projectedRows &&
            row === best.row &&
            col < best.col)
        ) {
          best = { row, col, vacant: score.vacant, projectedRows: score.projectedRows };
        }
      }
    }
  }
  return best ? { row: best.row, col: best.col } : null;
}

/**
 * Calculates grid layout in **packing order** (testimonials array order): each item is placed
 * with a deterministic hole-minimising search. Visual reading order may differ from array order — UI should
 * list quotes with `sortPlacementsReadingOrder` so the sidebar matches left→right, top→bottom.
 * Some hole patterns can still appear for non-tessellating rectangle sets.
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
    const sizeCandidates = parsed
      ? [parsed]
      : calculateCellSizeCandidates(testimonial.quote);

    let best: {
      row: number;
      col: number;
      rowSpan: number;
      colSpan: number;
      vacant: number;
      projectedRows: number;
      area: number;
    } | null = null;

    for (const candidate of sizeCandidates) {
      const rowSpan = Math.min(candidate.rowSpan, maxRows);
      const colSpan = Math.min(candidate.colSpan, maxCols);
      const position = findPlacement(grid, rowSpan, colSpan, maxCols, maxRows);
      if (!position) continue;
      const score = countProjectedVacancy(
        grid,
        maxCols,
        position.row,
        position.col,
        rowSpan,
        colSpan
      );
      const area = rowSpan * colSpan;
      if (
        !best ||
        score.vacant < best.vacant ||
        (score.vacant === best.vacant && score.projectedRows < best.projectedRows) ||
        (score.vacant === best.vacant &&
          score.projectedRows === best.projectedRows &&
          area > best.area)
      ) {
        best = {
          row: position.row,
          col: position.col,
          rowSpan,
          colSpan,
          vacant: score.vacant,
          projectedRows: score.projectedRows,
          area,
        };
      }
    }

    if (best) {
      placeCell(grid, best.row, best.col, best.rowSpan, best.colSpan, index, maxCols);

      const gridRow = best.rowSpan > 1
        ? `${best.row + 1} / span ${best.rowSpan}`
        : `${best.row + 1}`;
      const gridColumn = best.colSpan > 1
        ? `${best.col + 1} / span ${best.colSpan}`
        : `${best.col + 1}`;

      placements.push({
        testimonial,
        row: best.row,
        col: best.col,
        rowSpan: best.rowSpan,
        colSpan: best.colSpan,
        gridRow,
        gridColumn,
      });
    } else {
      const fallbackSize = sizeCandidates[0] ?? { rowSpan: 1, colSpan: 1 };
      const rowSpan = Math.min(fallbackSize.rowSpan, maxRows);
      const colSpan = Math.min(fallbackSize.colSpan, maxCols);
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
