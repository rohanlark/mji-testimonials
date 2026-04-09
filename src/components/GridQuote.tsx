import { CSSProperties } from 'react';
import { Testimonial, MetadataToggles, MetadataFieldKey, QuoteFontScaleOverride } from '../types/testimonial';
import { styleConfig } from '../lib/styleConfig';
import { getDisplayedMetadataEntries } from '../lib/metadataNormalize';
import { normalizeQuoteForLayout } from '../lib/quoteNormalize';
import { effectiveQuoteScale, lineHeightForQuoteScale } from '../lib/gridQuoteFontScale';

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
}: GridQuoteProps) {
  const displayedMetadata = getDisplayedMetadataEntries(testimonial, metadataToggles, metadataOrder);

  const scale = effectiveQuoteScale(colSpan, rowSpan, fontScaleOverride);
  const lineHeight = lineHeightForQuoteScale(scale);

  const displayQuote = normalizeQuoteForLayout(testimonial.quote);

  const cellStyle: CSSProperties = {
    ...styleConfig.grid.cell,
    minHeight: 0,
    overflow: 'visible',
    ...(gridRow && { gridRow }),
    ...(gridColumn && { gridColumn }),
    ...(onSelect && { cursor: 'pointer' }),
    ['--grid-quote-scale' as string]: scale,
    ['--grid-quote-line-height' as string]: lineHeight,
  };

  const rootClass = ['grid-quote', isSelected ? 'grid-quote-selected' : ''].filter(Boolean).join(' ');
  const canEditInModal = Boolean(onUpdateTestimonial && onRequestEdit);

  return (
    <div
      className={rootClass}
      style={cellStyle}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect() : undefined}
      onKeyDown={onSelect ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } } : undefined}
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
        <div className="grid-quote__inner">
          <div className="grid-quote__text" lang="en">
            {displayQuote}
          </div>
        </div>
        <div className="grid-quote__metadata" style={styleConfig.grid.metadata}>
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
