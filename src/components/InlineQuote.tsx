import { Testimonial, MetadataToggles, MetadataOrder } from '../types/testimonial';
import { styleConfig } from '../lib/styleConfig';

interface InlineQuoteProps {
  testimonial: Testimonial;
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

export function InlineQuote({ testimonial, metadataToggles, metadataOrder }: InlineQuoteProps) {
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

  return (
    <div style={styleConfig.inline.container}>
      <div style={styleConfig.inline.quote}>
        {testimonial.quote}
      </div>
      <div style={styleConfig.inline.metadata}>
        {formatMetadata()}
      </div>
    </div>
  );
}
