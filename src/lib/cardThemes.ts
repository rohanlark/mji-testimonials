import { CardSurfaceOverride, CardThemeId } from '../types/testimonial';

export interface CardThemeTokens {
  backgroundColor: string;
  border: string;
  boxShadow: string;
  quoteColor: string;
  quoteFontWeightGrid: number;
  quoteFontWeightStack: number;
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
    quoteFontWeightGrid: 400,
    quoteFontWeightStack: 600,
    metadataColor: '#002C3E',
    metadataFontWeight: 500,
    metadataDividerColor: '#E8E8E8',
  },
  dark: {
    backgroundColor: '#152028',
    border: '1px solid #2a3f4d',
    boxShadow: '0 1px 24px rgba(0, 0, 0, 0.25)',
    quoteColor: '#f0f4f6',
    quoteFontWeightGrid: 400,
    quoteFontWeightStack: 600,
    metadataColor: '#c8d4dc',
    metadataFontWeight: 500,
    metadataDividerColor: '#3d5260',
  },
  teal: {
    backgroundColor: '#e8f6f5',
    border: '1px solid #1b9e8e',
    boxShadow: '0 1px 24px rgba(27, 158, 142, 0.12)',
    quoteColor: '#063d38',
    quoteFontWeightGrid: 400,
    quoteFontWeightStack: 600,
    metadataColor: '#0a5249',
    metadataFontWeight: 500,
    metadataDividerColor: '#9ccbc4',
  },
};

export function getCardThemeTokens(theme: CardThemeId): CardThemeTokens {
  return CARD_THEMES[theme];
}

export function resolveCardThemeId(
  globalTheme: CardThemeId,
  override: CardSurfaceOverride | undefined
): CardThemeId {
  if (!override || override === 'inherit') return globalTheme;
  return override;
}
