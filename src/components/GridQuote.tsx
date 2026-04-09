import { CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import {
  Testimonial,
  MetadataToggles,
  MetadataFieldKey,
  QuoteFontScaleOverride,
  CardThemeId,
} from '../types/testimonial';
import { styleConfig } from '../lib/styleConfig';
import { getCardThemeTokens } from '../lib/cardThemes';
import { getDisplayedMetadataEntries } from '../lib/metadataNormalize';
import { normalizeQuoteForLayout } from '../lib/quoteNormalize';
import { lineHeightForQuoteScale } from '../lib/gridQuoteFontScale';
import { AUTO_FIT_LINE_HEIGHT, measureAutoQuoteFontSizePx } from '../lib/fitGridQuoteFont';

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

  const rootClass = ['grid-quote', isSelected ? 'grid-quote-selected' : ''].filter(Boolean).join(' ');
  const canEditInModal = Boolean(onUpdateTestimonial && onRequestEdit);

  const textStyle: CSSProperties = {
    color: tokens.quoteColor,
    fontWeight: tokens.quoteFontWeight,
    ...(isAuto && autoFontPx != null
      ? { fontSize: `${autoFontPx}px`, lineHeight: AUTO_FIT_LINE_HEIGHT }
      : {}),
  };

  return (
    <div
      className={rootClass}
      style={cellStyle}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect() : undefined}
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
    </div>
  );
}
