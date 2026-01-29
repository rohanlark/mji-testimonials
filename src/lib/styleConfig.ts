import { StyleConfig } from '../types/testimonial';

export const styleConfig: StyleConfig = {
  inline: {
    container: {
      backgroundColor: '#ffffff',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '2rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    quote: {
      fontSize: '24px',
      lineHeight: '1.6',
      padding: '0',
      marginBottom: '12px',
      color: '#333',
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: '400',
    },
    metadata: {
      fontSize: '14px',
      color: '#666',
      marginTop: '12px',
      paddingLeft: '0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: '400',
      lineHeight: '1.5',
    },
  },
  grid: {
    cell: {
      borderRadius: '12px',
      padding: '24px',
      backgroundColor: '#f5f5f5',
      border: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    },
    quote: {
      fontSize: '20px',
      lineHeight: '1.5',
      color: '#333',
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: '400',
      marginBottom: '16px',
      flex: '1',
    },
    metadata: {
      fontSize: '12px',
      color: '#888',
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: '1px solid #e0e0e0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: '400',
      lineHeight: '1.4',
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
