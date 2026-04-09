import { CSSProperties } from 'react';
import { StyleConfig } from '../types/testimonial';

/** Card surface: grid cells and stack-layout quotes (matches design spec). */
const CARD_CHROME: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #E8E8E8',
  borderRadius: '8px',
  padding: '24px',
  boxShadow: '0 1px 32px rgba(0, 0, 0, 0.03)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
};

/** Quote body: Lora italic semibold, brand text colour (grid + stack). */
const QUOTE_BODY: CSSProperties = {
  color: '#002C3E',
  fontFamily: '"Lora", Georgia, "Times New Roman", serif',
  fontStyle: 'italic',
  fontWeight: '600',
};

/** Metadata: Inter Tight medium, brand text colour (grid + stack). */
const METADATA_BODY: CSSProperties = {
  color: '#002C3E',
  fontFamily: '"Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontWeight: '500',
  lineHeight: '1.4',
};

export const styleConfig: StyleConfig = {
  inline: {
    container: {
      ...CARD_CHROME,
      marginBottom: '2rem',
    },
    quote: {
      ...QUOTE_BODY,
      fontSize: '24px',
      lineHeight: '1.5',
      padding: '0',
      marginBottom: '16px',
    },
    metadata: {
      ...METADATA_BODY,
      fontSize: '12px',
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: '1px solid #E8E8E8',
      paddingLeft: '0',
    },
  },
  grid: {
    cell: {
      ...CARD_CHROME,
    },
    quote: {
      ...QUOTE_BODY,
      fontSize: '20px',
      fontWeight: '400',
      marginBottom: '0',
      flex: '1',
    },
    metadata: {
      ...METADATA_BODY,
      fontSize: '12px',
      marginTop: '16px',
      paddingTop: '0',
      borderTop: 'none',
    },
  },
  colors: {
    primary: '#000000',
    secondary: '#666666',
    text: '#333333',
    background: '#ffffff',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontFamilySerif: 'Georgia, "Times New Roman", serif',
  },
};
