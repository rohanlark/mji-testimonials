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

/** Field keys for metadata, in default display order */
export const METADATA_FIELD_KEYS = ['year', 'country', 'age', 'state', 'visa', 'occupation'] as const;
export type MetadataFieldKey = (typeof METADATA_FIELD_KEYS)[number];

/** Order 1–6 for each metadata field (1 = first). Used to sort display order. */
export interface MetadataOrder {
  orderYear: number;
  orderCountry: number;
  orderAge: number;
  orderState: number;
  orderVisa: number;
  orderOccupation: number;
}

export type LayoutMode = 'inline' | 'grid';

export type ExportFormat = 'svg' | 'embed';

/** Per-quote grid size override. Format: [columns]x[rows]. Auto = use character-based sizing. */
export type GridSizeOverride =
  | 'auto'
  | '1x1'
  | '1x2'
  | '2x1'
  | '2x2'
  | '3x1'
  | '3x2'
  | '4x1'
  | '4x2';

export type GridSizeOverrideMap = Record<string, GridSizeOverride>;
