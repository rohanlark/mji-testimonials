import {
  DEFAULT_METADATA_ORDER,
  DEFAULT_METADATA_TOGGLES,
  LayoutMode,
  MetadataFieldKey,
  MetadataToggles,
  Testimonial,
  GridSizeOverride,
  QuoteFontScaleOverride,
  GridAspectRatio,
  GridDimensions,
  CardSurfaceOverride,
  GlobalCardThemeId,
  MobileFallbackMode,
} from '../types/testimonial';
import {
  DEFAULT_CARD_PADDING_PX,
  DEFAULT_LAYOUT_GAP_PX,
} from './layoutSpacing';
import { DEFAULT_GLOBAL_QUOTE_FONT_SCALE } from './quoteCardAppearanceOptions';

const STORAGE_KEY = 'mji.savedSetups.v1';

export interface ProjectDocumentV1 {
  schemaVersion: 1;
  testimonials: Testimonial[];
  layoutMode: LayoutMode;
  metadataToggles: MetadataToggles;
  metadataOrder: MetadataFieldKey[];
  gridSizeOverrides: Record<string, GridSizeOverride>;
  fontScaleOverrides: Record<string, QuoteFontScaleOverride>;
  gridAspectRatio: GridAspectRatio;
  gridAspectRatioFlipped: boolean;
  gridDimensions: GridDimensions;
  showGridLines: boolean;
  quoteHyphenation: boolean;
  globalCardTheme: GlobalCardThemeId;
  cardSurfaceOverrides: Record<string, CardSurfaceOverride>;
  layoutGapPx: number;
  cardPaddingPx: number;
  globalQuoteFontScale: number;
  mobileFallbackMode: MobileFallbackMode;
  swipeCardWidthPct: number;
}

export interface SavedSetupRecord {
  id: string;
  name: string;
  destination: string;
  keywords: string[];
  notes: string;
  layoutTag: string;
  cardsTag: string;
  themeTag: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  project: ProjectDocumentV1;
}

export interface SaveSetupInput {
  name: string;
  destination: string;
  keywords: string[];
  notes: string;
  project: ProjectDocumentV1;
}

export function serializeProjectDocument(input: Omit<ProjectDocumentV1, 'schemaVersion'>): ProjectDocumentV1 {
  return {
    schemaVersion: 1,
    ...input,
  };
}

function hydrateProjectDocumentV1(raw: Partial<ProjectDocumentV1>): ProjectDocumentV1 {
  return {
    schemaVersion: 1,
    testimonials: Array.isArray(raw.testimonials) ? raw.testimonials : [],
    layoutMode: (raw.layoutMode as LayoutMode) ?? 'grid',
    metadataToggles: raw.metadataToggles ?? DEFAULT_METADATA_TOGGLES,
    metadataOrder: Array.isArray(raw.metadataOrder) ? raw.metadataOrder : [...DEFAULT_METADATA_ORDER],
    gridSizeOverrides: raw.gridSizeOverrides ?? {},
    fontScaleOverrides: raw.fontScaleOverrides ?? {},
    gridAspectRatio: (raw.gridAspectRatio as GridAspectRatio) ?? 'fit',
    gridAspectRatioFlipped: Boolean(raw.gridAspectRatioFlipped),
    gridDimensions: raw.gridDimensions ?? { columns: 3, rows: 3 },
    showGridLines: Boolean(raw.showGridLines),
    quoteHyphenation: Boolean(raw.quoteHyphenation),
    globalCardTheme: (raw.globalCardTheme as GlobalCardThemeId) ?? 'light',
    cardSurfaceOverrides: raw.cardSurfaceOverrides ?? {},
    layoutGapPx: typeof raw.layoutGapPx === 'number' ? raw.layoutGapPx : DEFAULT_LAYOUT_GAP_PX,
    cardPaddingPx: typeof raw.cardPaddingPx === 'number' ? raw.cardPaddingPx : DEFAULT_CARD_PADDING_PX,
    globalQuoteFontScale:
      typeof raw.globalQuoteFontScale === 'number'
        ? raw.globalQuoteFontScale
        : DEFAULT_GLOBAL_QUOTE_FONT_SCALE,
    mobileFallbackMode: (raw.mobileFallbackMode as MobileFallbackMode) ?? 'swipe',
    swipeCardWidthPct: typeof raw.swipeCardWidthPct === 'number' ? raw.swipeCardWidthPct : 78,
  };
}

function readStoredSetups(): SavedSetupRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSetupRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === 'string' && item.project)
      .map((item) => ({
        ...item,
        keywords: Array.isArray(item.keywords) ? item.keywords : [],
        project: hydrateProjectDocumentV1(item.project),
      }));
  } catch {
    return [];
  }
}

function writeStoredSetups(records: SavedSetupRecord[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function toTag(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untagged';
}

export function listSavedSetups(): SavedSetupRecord[] {
  return readStoredSetups().sort(
    (a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime()
  );
}

export function saveSetup(input: SaveSetupInput): SavedSetupRecord {
  const records = readStoredSetups();
  const now = new Date().toISOString();
  const id = globalThis.crypto?.randomUUID?.() ?? `setup-${Date.now()}`;
  const cardsTag = `n${input.project.testimonials.length}`;
  const layoutTag = toTag(input.project.layoutMode);
  const themeTag = toTag(input.project.globalCardTheme);
  const next: SavedSetupRecord = {
    id,
    name: input.name.trim(),
    destination: input.destination.trim(),
    keywords: input.keywords.map((x) => x.trim()).filter(Boolean),
    notes: input.notes.trim(),
    layoutTag,
    cardsTag,
    themeTag,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    project: hydrateProjectDocumentV1(input.project),
  };
  records.push(next);
  writeStoredSetups(records);
  return next;
}

export function markSetupOpened(setupId: string): SavedSetupRecord | null {
  const records = readStoredSetups();
  const idx = records.findIndex((x) => x.id === setupId);
  if (idx === -1) return null;
  const updated = {
    ...records[idx],
    lastOpenedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  records[idx] = updated;
  writeStoredSetups(records);
  return updated;
}
