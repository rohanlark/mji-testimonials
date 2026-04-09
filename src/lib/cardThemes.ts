import { CardSurfaceOverride, CardThemeId, GlobalCardThemeId } from '../types/testimonial';

export interface CardThemeTokens {
  backgroundColor: string;
  border: string;
  boxShadow: string;
  quoteColor: string;
  /** Same for grid and stack; vary only between themes (colours). */
  quoteFontWeight: number;
  metadataColor: string;
  metadataFontWeight: number;
  /** Stack layout: border-top between quote and metadata. */
  metadataDividerColor: string;
}

const CARD_THEMES: Record<CardThemeId, CardThemeTokens> = {
  light: {
    backgroundColor: '#ffffff',
    border: '1px solid #E8E8E8',
    boxShadow: '0 1px 32px rgba(0, 0, 0, 0.03)',
    quoteColor: '#002C3E',
    quoteFontWeight: 400,
    metadataColor: '#002C3E',
    metadataFontWeight: 500,
    metadataDividerColor: '#E8E8E8',
  },
  dark: {
    backgroundColor: '#002130',
    border: '1px solid #002130',
    boxShadow: '0 1px 24px rgba(0, 0, 0, 0.22)',
    quoteColor: '#FFFFFF',
    quoteFontWeight: 400,
    metadataColor: '#FFFFFF',
    metadataFontWeight: 500,
    metadataDividerColor: 'rgba(255, 255, 255, 0.28)',
  },
  teal: {
    backgroundColor: '#0A7791',
    border: '1px solid #0A7791',
    boxShadow: '0 1px 24px rgba(0, 50, 60, 0.18)',
    quoteColor: '#FFFFFF',
    quoteFontWeight: 500,
    metadataColor: '#FFFFFF',
    metadataFontWeight: 600,
    metadataDividerColor: 'rgba(255, 255, 255, 0.35)',
  },
};

export function getCardThemeTokens(theme: CardThemeId): CardThemeTokens {
  return CARD_THEMES[theme];
}

export function resolveCardThemeId(
  globalTheme: GlobalCardThemeId,
  override: CardSurfaceOverride | undefined
): CardThemeId {
  if (!override || override === 'inherit') return globalTheme;
  return override;
}
