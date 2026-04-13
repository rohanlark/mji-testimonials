import { GridDimensions, Testimonial } from '../types/testimonial';

export type MobileFallbackMode = 'stack' | 'swipe';

export interface ResponsiveLayoutPolicyInput {
  widthPx: number;
  baseGapPx: number;
  baseCardPaddingPx: number;
  requestedGridDimensions: GridDimensions;
  mobileFallbackMode: MobileFallbackMode;
  swipeCardWidthPct: number;
  testimonials: Testimonial[];
}

export interface ResponsiveLayoutPolicyOutput {
  effectiveGapPx: number;
  effectiveCardPaddingPx: number;
  effectiveGridDimensions: GridDimensions;
  useMobileFallback: boolean;
  resolvedMobileMode: MobileFallbackMode;
  swipeCardWidthPct: number;
}

const MOBILE_BREAKPOINT = 640;
const TABLET_BREAKPOINT = 900;
const DESKTOP_BREAKPOINT = 1200;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function longQuoteDensity(testimonials: Testimonial[]): number {
  if (testimonials.length === 0) return 0;
  const long = testimonials.filter((t) => t.quote.trim().length >= 340).length;
  return long / testimonials.length;
}

export function getResponsiveLayoutPolicy(
  input: ResponsiveLayoutPolicyInput
): ResponsiveLayoutPolicyOutput {
  const {
    widthPx,
    baseGapPx,
    baseCardPaddingPx,
    requestedGridDimensions,
    mobileFallbackMode,
    swipeCardWidthPct,
    testimonials,
  } = input;

  let gapFactor = 1;
  let padFactor = 1;
  let maxColumns = requestedGridDimensions.columns;

  if (widthPx < MOBILE_BREAKPOINT) {
    gapFactor = 0.62;
    padFactor = 0.74;
    maxColumns = 1;
  } else if (widthPx < TABLET_BREAKPOINT) {
    gapFactor = 0.78;
    padFactor = 0.86;
    maxColumns = 2;
  } else if (widthPx < DESKTOP_BREAKPOINT) {
    gapFactor = 0.9;
    padFactor = 0.92;
    maxColumns = 3;
  }

  const effectiveGapPx = clamp(Math.round(baseGapPx * gapFactor), 6, baseGapPx);
  const effectiveCardPaddingPx = clamp(
    Math.round(baseCardPaddingPx * padFactor),
    8,
    baseCardPaddingPx
  );

  const effectiveGridDimensions: GridDimensions = {
    columns: clamp(requestedGridDimensions.columns, 1, maxColumns),
    rows: requestedGridDimensions.rows,
  };

  const useMobileFallback = widthPx < MOBILE_BREAKPOINT;
  const density = longQuoteDensity(testimonials);
  // Opportunistic readability improvement: dense long-quote sets read better stacked.
  const resolvedMobileMode: MobileFallbackMode =
    density >= 0.45 ? 'stack' : mobileFallbackMode;

  return {
    effectiveGapPx,
    effectiveCardPaddingPx,
    effectiveGridDimensions,
    useMobileFallback,
    resolvedMobileMode,
    swipeCardWidthPct: clamp(swipeCardWidthPct, 75, 85),
  };
}
