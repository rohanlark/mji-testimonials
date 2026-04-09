/**
 * Single-line quote text for layout and display: strips user line breaks and
 * collapses runs of whitespace (English v1).
 */
export function normalizeQuoteForLayout(quote: string): string {
  return quote.replace(/\s+/g, ' ').trim();
}
