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
} from '../types/testimonial';
import { styleConfig } from '../lib/styleConfig';
import { getCardThemeTokens } from '../lib/cardThemes';
import { getDisplayedMetadataEntries } from '../lib/metadataNormalize';
import { normalizeQuoteForLayout } from '../lib/quoteNormalize';
import { lineHeightForQuoteScale } from '../lib/gridQuoteFontScale';
import { AUTO_FIT_LINE_HEIGHT, measureAutoQuoteFontSizePx } from '../lib/fitGridQuoteFont';
import {
  computeSpannedCellsFromPointerDelta,
  readGridResizeSteps,
  spansToGridOverride,
  type GridResizeAxis,
} from '../lib/gridResizeDrag';

export interface GridQuoteResizeControl {
  containerRef: RefObject<HTMLDivElement | null>;
  packingRowCount: number;
  dimensions: GridDimensions;
  onPreview: (testimonialId: string, size: GridSizeOverride | null) => void;
  onLinesActive: (active: boolean) => void;
  onCommit: (testimonialId: string, size: GridSizeOverride) => void;
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
  /** When set and the card is selected, show grid resize handles (grid layout only). */
  gridResize?: GridQuoteResizeControl;
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
  gridResize,
}: GridQuoteProps) {
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
    if (!isAuto) {
      setAutoFontPx(null);
      return;
    }

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
  }, [isAuto, displayQuote, metadataSig, colSpan, rowSpan, testimonial.id]);

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

  const cellStyle: CSSProperties = {
    ...styleConfig.grid.cell,
    backgroundColor: tokens.backgroundColor,
    border: tokens.border,
    boxShadow: tokens.boxShadow,
    minHeight: 0,
    overflow: 'visible',
    ...(gridRow && { gridRow }),
    ...(gridColumn && { gridColumn }),
    ...(onSelect && { cursor: 'pointer' }),
    ['--grid-quote-scale' as string]: manualScale,
    ['--grid-quote-line-height' as string]: lineHeightCss,
  };

  const rootClass = [
    'grid-quote',
    isSelected ? 'grid-quote-selected' : '',
    showResizeHandles ? 'grid-quote--resize-handles' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const canEditInModal = Boolean(onUpdateTestimonial && onRequestEdit);

  const textStyle: CSSProperties = {
    color: tokens.quoteColor,
    fontWeight: tokens.quoteFontWeight,
    ...(isAuto && autoFontPx != null
      ? { fontSize: `${autoFontPx}px`, lineHeight: AUTO_FIT_LINE_HEIGHT }
      : {}),
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
              if ((ev.target as HTMLElement).closest('.grid-quote__resize-handle')) return;
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
              }
            }
          : undefined
      }
      lang="en"
    >
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
          <div className="grid-quote__text" ref={textRef} lang="en" style={textStyle}>
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
      {showResizeHandles ? (
        <>
          <div
            className="grid-quote__resize-handle grid-quote__resize-handle--e"
            aria-label="Resize quote width on grid"
            onPointerDown={startResizeDrag('e')}
            onPointerMove={onResizePointerMove}
            onPointerUp={(ev) => finishResizeDrag(ev, true)}
            onPointerCancel={(ev) => finishResizeDrag(ev, false)}
          />
          <div
            className="grid-quote__resize-handle grid-quote__resize-handle--s"
            aria-label="Resize quote height on grid"
            onPointerDown={startResizeDrag('s')}
            onPointerMove={onResizePointerMove}
            onPointerUp={(ev) => finishResizeDrag(ev, true)}
            onPointerCancel={(ev) => finishResizeDrag(ev, false)}
          />
          <div
            className="grid-quote__resize-handle grid-quote__resize-handle--se"
            aria-label="Resize quote width and height on grid"
            onPointerDown={startResizeDrag('se')}
            onPointerMove={onResizePointerMove}
            onPointerUp={(ev) => finishResizeDrag(ev, true)}
            onPointerCancel={(ev) => finishResizeDrag(ev, false)}
          />
        </>
      ) : null}
    </div>
  );
}
