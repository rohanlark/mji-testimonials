import { Testimonial, GridSizeOverride } from '../types/testimonial';

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
  const charCount = quote.length;
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

/** Parse override string "2x1" -> { colSpan: 2, rowSpan: 1 } */
function parseSizeOverride(override: GridSizeOverride): { rowSpan: number; colSpan: number } | null {
  if (override === 'auto') return null;
  const [colStr, rowStr] = override.split('x').map(Number);
  if (!Number.isInteger(colStr) || !Number.isInteger(rowStr)) return null;
  const colSpan = Math.min(Math.max(1, colStr), 4);
  const rowSpan = Math.min(Math.max(1, rowStr), 2);
  return { rowSpan, colSpan };
}

/**
 * Checks if a cell can be placed at the given position.
 * Only column bounds are checked here; rows are extended as needed (grid can grow downward).
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
 * Finds the first available position for a cell using first-fit algorithm
 */
function findPlacement(
  grid: (number | null)[][],
  rowSpan: number,
  colSpan: number,
  maxCols: number
): { row: number; col: number } | null {
  // Start from top-left, scan row by row
  for (let row = 0; row < grid.length + 10; row++) { // Allow some expansion
    for (let col = 0; col <= maxCols - colSpan; col++) {
      if (canPlace(grid, row, col, rowSpan, colSpan, maxCols)) {
        return { row, col };
      }
    }
  }
  
  return null;
}

/**
 * Calculates grid layout for testimonials using bin-packing algorithm
 * Returns placements with CSS Grid row/column values.
 * Optional overrides: testimonial id -> GridSizeOverride; when set and not 'auto', use that size.
 */
export function calculateGridLayout(
  testimonials: Testimonial[],
  maxCols: number = 4,
  overrides?: Record<string, GridSizeOverride>
): GridPlacement[] {
  if (testimonials.length === 0) {
    return [];
  }

  const items = testimonials.map((testimonial, index) => {
    const override = overrides?.[testimonial.id];
    const parsed = override ? parseSizeOverride(override) : null;
    const size = parsed ?? calculateCellSize(testimonial.quote);
    return { testimonial, index, size };
  });
  
  // Sort by size (largest first) for better packing efficiency
  items.sort((a, b) => {
    const aArea = a.size.rowSpan * a.size.colSpan;
    const bArea = b.size.rowSpan * b.size.colSpan;
    return bArea - aArea;
  });
  
  // Grid representation: null = empty, number = occupied by item index
  const grid: (number | null)[][] = [];
  
  const placements: GridPlacement[] = [];
  
  // Place each item
  for (const item of items) {
    const { rowSpan, colSpan } = item.size;
    
    const position = findPlacement(grid, rowSpan, colSpan, maxCols);
    
    if (position) {
      placeCell(grid, position.row, position.col, rowSpan, colSpan, item.index, maxCols);
      
      // CSS Grid uses 1-based indexing and span syntax
      const gridRow = rowSpan > 1 
        ? `${position.row + 1} / span ${rowSpan}`
        : `${position.row + 1}`;
      const gridColumn = colSpan > 1
        ? `${position.col + 1} / span ${colSpan}`
        : `${position.col + 1}`;
      
      placements.push({
        testimonial: item.testimonial,
        row: position.row,
        col: position.col,
        rowSpan,
        colSpan,
        gridRow,
        gridColumn,
      });
    } else {
      // Fallback: place at end if no space found (shouldn't happen with reasonable maxCols)
      const fallbackRow = grid.length;
      placeCell(grid, fallbackRow, 0, rowSpan, colSpan, item.index, maxCols);
      
      placements.push({
        testimonial: item.testimonial,
        row: fallbackRow,
        col: 0,
        rowSpan,
        colSpan,
        gridRow: fallbackRow + 1 + (rowSpan > 1 ? ` / span ${rowSpan}` : ''),
        gridColumn: `1 / span ${colSpan}`,
      });
    }
  }
  
  // Sort placements back to original order
  placements.sort((a, b) => {
    const aIndex = testimonials.indexOf(a.testimonial);
    const bIndex = testimonials.indexOf(b.testimonial);
    return aIndex - bIndex;
  });
  
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
