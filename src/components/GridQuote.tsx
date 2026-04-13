import { CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
  Testimonial,
  MetadataToggles,
  MetadataFieldKey,
  QuoteFontScaleOverride,
  CardThemeId,
  GridDimensions,
  GridSizeOverride,
  CardSurfaceOverride,
  CARD_THEME_IDS,
  CARD_THEME_LABELS,
} from '../types/testimonial';
import {
  MANUAL_FONT_SCALE_SEQUENCE,
  stepQuoteFontScale,
} from '../lib/quoteCardAppearanceOptions';
import { styleConfig } from '../lib/styleConfig';
import { getCardThemeTokens } from '../lib/cardThemes';
import { getDisplayedMetadataEntries } from '../lib/metadataNormalize';
import { normalizeQuoteForLayout } from '../lib/quoteNormalize';
import { lineHeightForQuoteScale } from '../lib/gridQuoteFontScale';
import { AUTO_FIT_LINE_HEIGHT, measureAutoQuoteFontSizePx } from '../lib/fitGridQuoteFont';
import { DEFAULT_CARD_PADDING_PX } from '../lib/layoutSpacing';
import {
  computeSpannedCellsFromPointerDelta,
  readGridResizeSteps,
  spansToGridOverride,
  type GridResizeAxis,
} from '../lib/gridResizeDrag';

const GRID_RESIZE_HANDLES: { axis: GridResizeAxis; label: string }[] = [
  { axis: 'n', label: 'Resize grid cell height from top' },
  { axis: 'e', label: 'Resize grid cell width from right' },
  { axis: 's', label: 'Resize grid cell height from bottom' },
  { axis: 'w', label: 'Resize grid cell width from left' },
  { axis: 'nw', label: 'Resize grid cell from top-left' },
  { axis: 'ne', label: 'Resize grid cell from top-right' },
  { axis: 'se', label: 'Resize grid cell from bottom-right' },
  { axis: 'sw', label: 'Resize grid cell from bottom-left' },
];

export interface GridQuoteResizeControl {
  containerRef: RefObject<HTMLDivElement | null>;
  packingRowCount: number;
  dimensions: GridDimensions;
  onPreview: (testimonialId: string, size: GridSizeOverride | null) => void;
  onLinesActive: (active: boolean) => void;
  onCommit: (testimonialId: string, size: GridSizeOverride) => void;
}

/** Per-card appearance when the quote is selected (cell size = drag handles only). */
export interface GridQuoteAppearanceControl {
  fontScale: QuoteFontScaleOverride;
  onFontScaleChange: (scale: QuoteFontScaleOverride) => void;
  cardSurface: CardSurfaceOverride;
  onCardSurfaceChange: (surface: CardSurfaceOverride) => void;
}

interface GridQuoteProps {
  testimonial: Testimonial;
  gridRow?: string;
  gridColumn?: string;
  rowSpan?: number;
  colSpan?: number;
  metadataToggles: MetadataToggles;
  metadataOrder: MetadataFieldKey[];
  onUpdateTestimonial?: (id: string, partial: Partial<Testimonial>) => void;
  fontScaleOverride?: QuoteFontScaleOverride;
  onSelect?: () => void;
  isSelected?: boolean;
  /** Opens quote edit modal on double-click (grid and single-column layout). */
  onRequestEdit?: (id: string) => void;
  cardTheme: CardThemeId;
  /** When true, allow automatic hyphenation in quote text across lines. */
  quoteHyphenation?: boolean;
  /** When set and the card is selected, show grid resize handles (grid layout only). */
  gridResize?: GridQuoteResizeControl;
  /** When set and the card is selected, show compact appearance controls on the card. */
  appearanceControl?: GridQuoteAppearanceControl;
  /** Inner padding of the card (inset before quote and metadata). */
  cardPaddingPx?: number;
}

export function GridQuote({
  testimonial,
  gridRow,
  gridColumn,
  rowSpan = 1,
  colSpan = 1,
  metadataToggles,
  metadataOrder,
  onUpdateTestimonial,
  fontScaleOverride,
  onSelect,
  isSelected,
  onRequestEdit,
  cardTheme,
  quoteHyphenation = false,
  gridResize,
  appearanceControl,
  cardPaddingPx = DEFAULT_CARD_PADDING_PX,
}: GridQuoteProps) {
  type ManualScale = (typeof MANUAL_FONT_SCALE_SEQUENCE)[number];
  const displayedMetadata = getDisplayedMetadataEntries(testimonial, metadataToggles, metadataOrder);
  const tokens = getCardThemeTokens(cardTheme);

  const isAuto = fontScaleOverride === undefined || fontScaleOverride === 'auto';
  const manualScale = isAuto ? 1 : fontScaleOverride;
  const lineHeightCss = isAuto ? AUTO_FIT_LINE_HEIGHT : lineHeightForQuoteScale(manualScale);

  const displayQuote = normalizeQuoteForLayout(testimonial.quote);
  const metadataSig = displayedMetadata.map((e) => `${e.key}:${e.value}`).join('|');

  const innerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [autoFontPx, setAutoFontPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    const text = textRef.current;
    if (!inner || !text) return;

    let cancelled = false;
    let ro: ResizeObserver | null = null;

    const measure = () => {
      if (cancelled) return;
      const w = inner.clientWidth;
      const h = inner.clientHeight;
      const px = measureAutoQuoteFontSizePx(text, w, h, AUTO_FIT_LINE_HEIGHT);
      setAutoFontPx(px);
    };

    const schedule = () => {
      requestAnimationFrame(measure);
    };

    void document.fonts.ready.then(() => {
      if (cancelled) return;
      schedule();
      ro = new ResizeObserver(schedule);
      ro.observe(inner);
    });

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [displayQuote, metadataSig, colSpan, rowSpan, testimonial.id, cardPaddingPx]);

  const resizeSessionRef = useRef<{
    pointerId: number;
    axis: GridResizeAxis;
    startColSpan: number;
    startRowSpan: number;
    startX: number;
    startY: number;
    colStep: number;
    rowStep: number;
    lastOverride: GridSizeOverride;
  } | null>(null);

  const showResizeHandles = Boolean(gridResize && isSelected && gridRow && gridColumn);
  const showAppearanceChrome = Boolean(isSelected && appearanceControl);

  const cellStyle: CSSProperties = {
    ...styleConfig.grid.cell,
    padding: `${cardPaddingPx}px`,
    backgroundColor: tokens.backgroundColor,
    border: tokens.border,
    boxShadow: tokens.boxShadow,
    minHeight: 0,
    overflow: 'visible',
    ...(gridRow && { gridRow }),
    ...(gridColumn && { gridColumn }),
    ...(onSelect && { cursor: 'pointer' }),
    // Keep default cards content-sized so row tracks can collapse after text shrinks.
    // Spanning cards still fill their allocated tracks to respect manual grid sizing.
    alignSelf: rowSpan > 1 ? 'stretch' : 'start',
    ['--grid-quote-scale' as string]: manualScale,
    ['--grid-quote-line-height' as string]: lineHeightCss,
  };

  const rootClass = [
    'grid-quote',
    isSelected ? 'grid-quote-selected' : '',
    showResizeHandles ? 'grid-quote--resize-handles' : '',
    showAppearanceChrome ? 'grid-quote--appearance' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const canEditInModal = Boolean(onUpdateTestimonial && onRequestEdit);

  const textStyle: CSSProperties = {
    color: tokens.quoteColor,
    fontWeight: tokens.quoteFontWeight,
    hyphens: quoteHyphenation ? 'auto' : 'none',
    WebkitHyphens: quoteHyphenation ? 'auto' : 'none',
    ...(isAuto && autoFontPx != null
      ? { fontSize: `${autoFontPx}px`, lineHeight: AUTO_FIT_LINE_HEIGHT }
      : {}),
  };

  const getMaxAllowedScaleTier = (): ManualScale | null => {
    const textEl = textRef.current;
    if (!textEl || autoFontPx == null || !Number.isFinite(autoFontPx) || autoFontPx <= 0) {
      return null;
    }

    const currentPx = parseFloat(window.getComputedStyle(textEl).fontSize);
    if (!Number.isFinite(currentPx) || currentPx <= 0 || manualScale <= 0) {
      return null;
    }

    const basePx = currentPx / manualScale;
    if (!Number.isFinite(basePx) || basePx <= 0) {
      return null;
    }

    const rawMaxScale = autoFontPx / basePx;
    const minScale = MANUAL_FONT_SCALE_SEQUENCE[0];
    const maxScale = Math.max(minScale, rawMaxScale);
    const tier = [...MANUAL_FONT_SCALE_SEQUENCE]
      .reverse()
      .find((v) => v <= maxScale + 0.0001);
    return tier ?? minScale;
  };

  const stepScaleWithCap = (
    current: QuoteFontScaleOverride,
    direction: -1 | 1
  ): QuoteFontScaleOverride => {
    const candidate = stepQuoteFontScale(current, direction);
    if (direction < 0 || candidate === 'auto') return candidate;

    const maxTier = getMaxAllowedScaleTier();
    if (maxTier == null || candidate <= maxTier) return candidate;
    if (current !== 'auto' && current > maxTier) return current;
    return maxTier;
  };

  const startResizeDrag = (axis: GridResizeAxis) => (e: React.PointerEvent) => {
    if (!gridResize) return;
    e.stopPropagation();
    e.preventDefault();
    const gridEl = gridResize.containerRef.current;
    if (!gridEl) return;

    const { colStep, rowStep } = readGridResizeSteps(
      gridEl,
      gridResize.dimensions.columns,
      gridResize.packingRowCount
    );
    const lastOverride = spansToGridOverride(colSpan, rowSpan);
    resizeSessionRef.current = {
      pointerId: e.pointerId,
      axis,
      startColSpan: colSpan,
      startRowSpan: rowSpan,
      startX: e.clientX,
      startY: e.clientY,
      colStep,
      rowStep,
      lastOverride,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gridResize.onLinesActive(true);
    gridResize.onPreview(testimonial.id, lastOverride);
  };

  const onResizePointerMove = (e: React.PointerEvent) => {
    const s = resizeSessionRef.current;
    const gr = gridResize;
    if (!s || !gr || e.pointerId !== s.pointerId) return;

    const deltaX = e.clientX - s.startX;
    const deltaY = e.clientY - s.startY;
    const { colSpan: nc, rowSpan: nr } = computeSpannedCellsFromPointerDelta({
      axis: s.axis,
      deltaX,
      deltaY,
      startColSpan: s.startColSpan,
      startRowSpan: s.startRowSpan,
      colStep: s.colStep,
      rowStep: s.rowStep,
      dimensions: gr.dimensions,
    });
    const next = spansToGridOverride(nc, nr);
    if (next !== s.lastOverride) {
      s.lastOverride = next;
      gr.onPreview(testimonial.id, next);
    }
  };

  const finishResizeDrag = (e: React.PointerEvent, commit: boolean) => {
    const s = resizeSessionRef.current;
    const gr = gridResize;
    if (!s || !gr || e.pointerId !== s.pointerId) return;

    const finalOverride = s.lastOverride;
    resizeSessionRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    gr.onLinesActive(false);
    gr.onPreview(testimonial.id, null);
    if (commit) {
      gr.onCommit(testimonial.id, finalOverride);
    }
  };

  return (
    <div
      className={rootClass}
      style={cellStyle}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={
        onSelect
          ? (ev) => {
              const t = ev.target as HTMLElement;
              if (t.closest('.grid-quote__resize-handle, .grid-quote__chrome')) return;
              onSelect();
            }
          : undefined
      }
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect();
                return;
              }
              if (!isSelected || !appearanceControl) return;
              const isIncreaseKey = e.key === '+' || e.key === '=' || e.key === 'NumpadAdd';
              const isDecreaseKey = e.key === '-' || e.key === '_' || e.key === 'NumpadSubtract';
              if (!isIncreaseKey && !isDecreaseKey) return;
              e.preventDefault();
              const direction: -1 | 1 = isIncreaseKey ? 1 : -1;
              const nextScale = stepScaleWithCap(appearanceControl.fontScale, direction);
              if (nextScale !== appearanceControl.fontScale) {
                appearanceControl.onFontScaleChange(nextScale);
              }
            }
          : undefined
      }
      lang="en-AU"
    >
      {showAppearanceChrome && appearanceControl ? (
        <div
          className="grid-quote__chrome"
          role="toolbar"
          aria-label="Quote appearance"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="grid-quote__chrome-themes"
            role="radiogroup"
            aria-label="Card theme"
          >
            {CARD_THEME_IDS.map((tid) => {
              const pressed =
                appearanceControl.cardSurface === 'inherit'
                  ? cardTheme === tid
                  : appearanceControl.cardSurface === tid;
              return (
                <button
                  key={tid}
                  type="button"
                  className="grid-quote__chrome-swatch"
                  role="radio"
                  aria-checked={pressed}
                  aria-label={`${CARD_THEME_LABELS[tid]} card theme`}
                  title={CARD_THEME_LABELS[tid]}
                  onClick={() => appearanceControl.onCardSurfaceChange(tid)}
                >
                  <span
                    className={`grid-quote__chrome-dot grid-quote__chrome-dot--${tid}`}
                    aria-hidden
                  >
                    {pressed ? (
                      <span className={`grid-quote__chrome-check grid-quote__chrome-check--${tid}`}>
                        ✓
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="grid-quote__chrome-font-caption" aria-hidden>
            Font
          </span>

          <div
            className="grid-quote__chrome-font-pill"
            role="group"
            aria-label="Font size"
          >
            {(() => {
              const nextUp = stepScaleWithCap(appearanceControl.fontScale, 1);
              const nextDown = stepScaleWithCap(appearanceControl.fontScale, -1);
              return (
                <>
            <button
              type="button"
              className="grid-quote__chrome-pill-btn grid-quote__chrome-pill-btn--plus"
              aria-label="Larger text"
              disabled={nextUp === appearanceControl.fontScale}
              onClick={() => appearanceControl.onFontScaleChange(nextUp)}
            >
              +
            </button>
            <button
              type="button"
              className="grid-quote__chrome-pill-btn grid-quote__chrome-pill-btn--minus"
              aria-label="Smaller text"
              disabled={nextDown === appearanceControl.fontScale}
              onClick={() => appearanceControl.onFontScaleChange(nextDown)}
            >
              −
            </button>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}
      <div
        className="grid-quote__body"
        title={canEditInModal ? 'Double-click to edit quote and metadata' : undefined}
        onDoubleClick={
          canEditInModal
            ? (e) => {
                e.stopPropagation();
                e.preventDefault();
                onRequestEdit!(testimonial.id);
              }
            : undefined
        }
      >
        <div className="grid-quote__inner" ref={innerRef}>
          <div className="grid-quote__text" ref={textRef} lang="en-AU" style={textStyle}>
            {displayQuote}
          </div>
        </div>
        <div
          className="grid-quote__metadata"
          style={{
            ...styleConfig.grid.metadata,
            color: tokens.metadataColor,
            fontWeight: tokens.metadataFontWeight,
          }}
        >
          {displayedMetadata.map(({ key, value }, i) => (
            <span key={key}>
              {i > 0 && ' • '}
              {value}
            </span>
          ))}
        </div>
      </div>
      {showResizeHandles
        ? GRID_RESIZE_HANDLES.map(({ axis, label }) => (
            <div
              key={axis}
              className={`grid-quote__resize-handle grid-quote__resize-handle--${axis}`}
              aria-label={label}
              onPointerDown={startResizeDrag(axis)}
              onPointerMove={onResizePointerMove}
              onPointerUp={(ev) => finishResizeDrag(ev, true)}
              onPointerCancel={(ev) => finishResizeDrag(ev, false)}
            />
          ))
        : null}
    </div>
  );
}
