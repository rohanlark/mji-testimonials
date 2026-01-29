import { CSSProperties } from 'react';
import { Testimonial, MetadataToggles, MetadataOrder } from '../types/testimonial';
import { styleConfig } from '../lib/styleConfig';

/** Font scale by cell size (colSpan x rowSpan) so long text fits in small cells */
const FONT_SCALE_MAP: Record<string, number> = {
  '1x1': 0.8,
  '2x1': 0.9,
  '1x2': 0.9,
  '3x1': 1.0,
  '2x2': 1.0,
  '4x1': 1.0,
  '3x2': 0.95,
  '4x2': 0.95,
};

interface GridQuoteProps {
  testimonial: Testimonial;
  gridRow?: string;
  gridColumn?: string;
  rowSpan?: number;
  colSpan?: number;
  metadataToggles: MetadataToggles;
  metadataOrder: MetadataOrder;
}

const FIELD_ORDER_KEYS: (keyof MetadataOrder)[] = [
  'orderYear', 'orderCountry', 'orderAge', 'orderState', 'orderVisa', 'orderOccupation',
];
const FIELD_TO_TOGGLE: Record<string, keyof MetadataToggles> = {
  orderYear: 'showYear', orderCountry: 'showCountry', orderAge: 'showAge',
  orderState: 'showState', orderVisa: 'showVisa', orderOccupation: 'showOccupation',
};
const FIELD_TO_VALUE: Record<string, keyof Testimonial> = {
  orderYear: 'year', orderCountry: 'country', orderAge: 'age',
  orderState: 'state', orderVisa: 'visa', orderOccupation: 'occupation',
};

export function GridQuote({ testimonial, gridRow, gridColumn, rowSpan = 1, colSpan = 1, metadataToggles, metadataOrder }: GridQuoteProps) {
  const formatMetadata = () => {
    const entries = FIELD_ORDER_KEYS
      .filter((key) => metadataToggles[FIELD_TO_TOGGLE[key]])
      .map((key) => ({
        order: metadataOrder[key],
        value: testimonial[FIELD_TO_VALUE[key]],
        key,
      }))
      .filter((e) => e.value)
      .sort((a, b) => a.order - b.order);
    return entries.map((e) => e.value).join(' • ');
  };

  const sizeKey = `${colSpan}x${rowSpan}`;
  const fontScale = FONT_SCALE_MAP[sizeKey] ?? 1;
  const baseQuoteFontSize = 20;
  const scaledFontSize = baseQuoteFontSize * fontScale;

  const cellStyle: CSSProperties = {
    ...styleConfig.grid.cell,
    ...(gridRow && { gridRow }),
    ...(gridColumn && { gridColumn }),
  };

  const quoteStyle: CSSProperties = {
    ...styleConfig.grid.quote,
    fontSize: `${scaledFontSize}px`,
  };

  return (
    <div style={cellStyle}>
      <div style={quoteStyle}>
        {testimonial.quote}
      </div>
      <div style={styleConfig.grid.metadata}>
        {formatMetadata()}
      </div>
    </div>
  );
}
