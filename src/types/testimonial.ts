import { CSSProperties } from 'react';

export interface Testimonial {
  id: string;
  quote: string;
  year: string;
  country: string;
  age: string;
  state: string;
  visa: string;
  occupation: string;
}

export interface StyleConfig {
  inline: {
    container: CSSProperties;
    quote: CSSProperties;
    metadata: CSSProperties;
  };
  grid: {
    cell: CSSProperties;
    quote: CSSProperties;
    metadata: CSSProperties;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
  };
  typography: {
    fontFamily: string;
    fontFamilySerif: string;
  };
}

export interface MetadataToggles {
  showYear: boolean;
  showCountry: boolean;
  showAge: boolean;
  showState: boolean;
  showVisa: boolean;
  showOccupation: boolean;
}

/** All testimonial metadata field keys (canonical order). */
export const METADATA_FIELD_KEYS = ['year', 'country', 'age', 'state', 'visa', 'occupation'] as const;
export type MetadataFieldKey = (typeof METADATA_FIELD_KEYS)[number];

/**
 * Initial metadata order (all fields; reorder in sidebar). Matches default UX: Age, Country,
 * Occupation first, then Year, State, Visa.
 */
export const DEFAULT_METADATA_ORDER: MetadataFieldKey[] = [
  'age',
  'country',
  'occupation',
  'year',
  'state',
  'visa',
];

/** Default visibility: Age, Country, Occupation on; Year, State, Visa off. */
export const DEFAULT_METADATA_TOGGLES: MetadataToggles = {
  showYear: false,
  showCountry: true,
  showAge: true,
  showState: false,
  showVisa: false,
  showOccupation: true,
};

/** Display order for metadata: ordered array of field keys (first = show first). */
export type MetadataOrderArray = MetadataFieldKey[];

/** Map metadata field key to its toggle key in MetadataToggles */
export const METADATA_FIELD_TO_TOGGLE: Record<MetadataFieldKey, keyof MetadataToggles> = {
  year: 'showYear',
  country: 'showCountry',
  age: 'showAge',
  state: 'showState',
  visa: 'showVisa',
  occupation: 'showOccupation',
};

/** Human-readable labels for metadata fields (sidebar/list) */
export const METADATA_FIELD_LABELS: Record<MetadataFieldKey, string> = {
  year: 'Year',
  country: 'Country',
  age: 'Age',
  state: 'State',
  visa: 'Visa',
  occupation: 'Occupation',
};

export type LayoutMode = 'stack' | 'grid';

/** Named card surface themes (colours and type weights are defined in `cardThemes.ts`). */
export const CARD_THEME_IDS = ['light', 'dark', 'teal', 'oftail'] as const;
export type CardThemeId = (typeof CARD_THEME_IDS)[number];

/** Per-quote surface: follow global theme, or pin to a named theme. */
export type CardSurfaceOverride = 'inherit' | CardThemeId;

export const CARD_THEME_LABELS: Record<CardThemeId, string> = {
  light: 'Light',
  dark: 'Dark',
  teal: 'Teal',
  oftail: 'Oftail',
};

export type ExportFormat = 'svg' | 'embed';

/** Per-quote grid size override. Format: [columns]x[rows]. Auto = use character-based sizing. Columns 1–4, rows 1–4. */
export type GridSizeOverride =
  | 'auto'
  | '1x1'
  | '1x2'
  | '1x3'
  | '1x4'
  | '2x1'
  | '2x2'
  | '2x3'
  | '2x4'
  | '3x1'
  | '3x2'
  | '3x3'
  | '3x4'
  | '4x1'
  | '4x2'
  | '4x3'
  | '4x4';

export const ALL_GRID_SIZE_OPTIONS: GridSizeOverride[] = [
  'auto',
  '1x1', '1x2', '1x3', '1x4',
  '2x1', '2x2', '2x3', '2x4',
  '3x1', '3x2', '3x3', '3x4',
  '4x1', '4x2', '4x3', '4x4',
];

/** Grid dimensions: columns and rows (each 1–4). Top-left selector = 1x1, bottom-right = 4x4. */
export type GridDimensions = { columns: number; rows: number };

/** Parse "2x1" -> { colSpan: 2, rowSpan: 1 }. Returns null for 'auto' or invalid. */
export function parseGridSizeOverride(override: GridSizeOverride): { colSpan: number; rowSpan: number } | null {
  if (override === 'auto') return null;
  const [colStr, rowStr] = override.split('x').map(Number);
  if (!Number.isInteger(colStr) || !Number.isInteger(rowStr)) return null;
  const colSpan = Math.min(Math.max(1, colStr), 4);
  const rowSpan = Math.min(Math.max(1, rowStr), 4);
  return { colSpan, rowSpan };
}

/** Whether a size override fits within the given grid dimensions. */
export function gridSizeFits(override: GridSizeOverride, dimensions: GridDimensions): boolean {
  const parsed = parseGridSizeOverride(override);
  if (!parsed) return true; // 'auto' always fits
  return parsed.colSpan <= dimensions.columns && parsed.rowSpan <= dimensions.rows;
}

/** Options valid for the current grid (columns x rows). Always includes 'auto'. */
export function getValidGridSizeOptions(dimensions: GridDimensions): GridSizeOverride[] {
  return ALL_GRID_SIZE_OPTIONS.filter(
    (opt) => opt === 'auto' || gridSizeFits(opt, dimensions)
  );
}

/** Clamp override to fit dimensions; returns 'auto' if override doesn't fit. */
export function clampGridSizeOverride(override: GridSizeOverride, dimensions: GridDimensions): GridSizeOverride {
  if (override === 'auto') return 'auto';
  if (gridSizeFits(override, dimensions)) return override;
  return 'auto';
}

/** Human-readable label: `auto` or e.g. `3×2` (matches layout grid display). */
export function formatGridSizeOverrideLabel(size: GridSizeOverride): string {
  if (size === 'auto') return 'auto';
  const p = parseGridSizeOverride(size);
  return p ? `${p.colSpan}×${p.rowSpan}` : String(size);
}

export type GridSizeOverrideMap = Record<string, GridSizeOverride>;

/** Per-quote font scale override for grid cells. Auto = scale from cell size. */
export type QuoteFontScaleOverride = 'auto' | 0.8 | 0.9 | 1 | 1.1 | 1.2 | 1.4;

/** Overall grid container aspect ratio. `fit` = height follows content (no fixed frame). Flipped swaps width/height (e.g. 16:9 → 9:16). */
export type GridAspectRatio = 'fit' | '1:1' | '4:5' | '16:9' | 'a4';

export const GRID_ASPECT_RATIO_OPTIONS: { value: GridAspectRatio; label: string }[] = [
  { value: 'fit', label: 'Fit' },
  { value: '1:1', label: '1∶1' },
  { value: '4:5', label: '4∶5' },
  { value: '16:9', label: '16∶9' },
  { value: 'a4', label: 'A4' },
];

/** CSS aspect-ratio value for the grid container (e.g. "16/9"). Flipped inverts. Not used when ratio is `fit`. */
export function getGridAspectRatioCss(ratio: GridAspectRatio, flipped: boolean): string {
  if (ratio === 'fit') {
    return 'auto';
  }
  const map: Record<Exclude<GridAspectRatio, 'fit'>, string> = {
    '1:1': '1',
    '4:5': '4/5',
    '16:9': '16/9',
    a4: '210/297',
  };
  const base = map[ratio];
  if (ratio === '1:1') return base;
  if (!flipped) return base;
  const [w, h] = base.split('/').map(Number);
  return `${h}/${w}`;
}
