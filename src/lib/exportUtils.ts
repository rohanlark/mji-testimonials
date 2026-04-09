import { load as opentypeLoad } from 'opentype.js';
import { elementToSVG, inlineResources } from 'dom-to-svg';
import { CSSProperties } from 'react';
import {
  Testimonial,
  LayoutMode,
  MetadataToggles,
  DEFAULT_METADATA_TOGGLES,
  DEFAULT_METADATA_ORDER,
  MetadataFieldKey,
  GridDimensions,
  GridSizeOverride,
  QuoteFontScaleOverride,
  CardThemeId,
  CardSurfaceOverride,
} from '../types/testimonial';
import { getCardThemeTokens, resolveCardThemeId } from './cardThemes';
import { calculateGridLayout, calculateGridRows } from './gridLayout';
import { formatOccupationForDisplay, getDisplayedMetadataEntries } from './metadataNormalize';
import { normalizeQuoteForLayout } from './quoteNormalize';
import { styleConfig } from './styleConfig';
import { lineHeightForQuoteScale } from './gridQuoteFontScale';
import { AUTO_FIT_LINE_HEIGHT } from './fitGridQuoteFont';

import type { Font as OpentypeFont } from 'opentype.js';

/** Local paths (Vite serves public/ at root); use these first so export works offline. */
const LOCAL_SERIF = '/fonts/CrimsonText-Regular.ttf';
const LOCAL_SANS = '/fonts/Lato-Regular.ttf';

/** Raw TTF URLs (static fonts; some CDNs return a zip which opentype.js rejects as "Unsupported OpenType signature Pack"). */
const SERIF_FONT_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/crimsontext/CrimsonText-Regular.ttf';
const SANS_FONT_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Regular.ttf';

let quoteFontCache: OpentypeFont | null = null;
let metaFontCache: OpentypeFont | null = null;

function loadFontWithFallback(localPath: string, cdnUrl: string): Promise<OpentypeFont> {
  return (opentypeLoad(localPath) as Promise<OpentypeFont>).catch(() =>
    opentypeLoad(cdnUrl) as Promise<OpentypeFont>
  );
}

/** Load fonts for outline export (cached). Tries local /fonts/ first, then raw GitHub. */
export async function loadOutlineFonts(): Promise<{ quote: OpentypeFont; meta: OpentypeFont }> {
  if (quoteFontCache && metaFontCache) return { quote: quoteFontCache, meta: metaFontCache };
  const [quote, meta] = await Promise.all([
    loadFontWithFallback(LOCAL_SERIF, SERIF_FONT_URL),
    loadFontWithFallback(LOCAL_SANS, SANS_FONT_URL),
  ]);
  quoteFontCache = quote;
  metaFontCache = meta;
  return { quote, meta };
}

/**
 * Converts CSS properties object to inline CSS string
 */
function cssObjectToString(styles: CSSProperties): string {
  return Object.entries(styles)
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${value};`;
    })
    .join(' ');
}

/**
 * Generates SVG export from current view
 */
export async function exportToSVG(
  element: HTMLElement,
  _testimonials: Testimonial[],
  _layoutMode: LayoutMode
): Promise<string> {
  try {
    // Clone the element to avoid modifying the original
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Convert to SVG
    const svgDocument = elementToSVG(clonedElement);
    
    // Inline resources (fonts, images, etc.)
    await inlineResources(svgDocument.documentElement);
    
    // Serialize to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgDocument);
    
    return svgString;
  } catch (error) {
    console.error('SVG export error:', error);
    throw new Error('Failed to export SVG: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Generates self-contained HTML embed code
 */
export function generateEmbedCode(
  testimonials: Testimonial[],
  layoutMode: LayoutMode,
  gridDimensions: GridDimensions = { columns: 4, rows: 4 },
  gridSizeOverrides: Record<string, GridSizeOverride> = {},
  fontScaleOverrides: Record<string, QuoteFontScaleOverride> = {},
  globalCardTheme: CardThemeId = 'light',
  cardSurfaceOverrides: Record<string, CardSurfaceOverride> = {}
): string {
  const gridMetadataBase = cssObjectToString({
    fontFamily: styleConfig.grid.metadata.fontFamily,
    fontSize: styleConfig.grid.metadata.fontSize,
    marginTop: styleConfig.grid.metadata.marginTop,
    paddingTop: styleConfig.grid.metadata.paddingTop,
    lineHeight: styleConfig.grid.metadata.lineHeight,
  });

  let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
  html += '<meta charset="UTF-8">\n';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  html += '<title>MJI Testimonials</title>\n';
  html +=
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500&family=Lora:ital,wght@0,400;0,600;1,400;1,600&display=swap" rel="stylesheet">\n';
  html += '<style>\n';
  html += '  * { margin: 0; padding: 0; box-sizing: border-box; }\n';
  html +=
    '  body { font-family: ' +
    styleConfig.typography.fontFamily +
    '; padding: 0; margin: 0; background: transparent; }\n';

  if (layoutMode === 'stack') {
    html += '  .testimonial-stack-embed { display: flex; flex-direction: column; gap: 1rem; width: 100%; }\n';
    html +=
      '  .testimonial-card { border-radius: 8px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; }\n';
    html +=
      '  .stack-quote { font-family: "Lora", Georgia, "Times New Roman", serif; font-style: italic; line-height: 1.5; font-size: 24px; padding: 0; margin-bottom: 16px; text-decoration: none; overflow-wrap: anywhere; hyphens: auto; }\n';
    html +=
      '  .stack-metadata { font-family: "Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; margin-top: 16px; padding-top: 16px; padding-left: 0; line-height: 1.4; }\n';
  } else {
    html +=
      '  .grid-container { display: grid; gap: 1rem; width: 100%; align-content: start; }\n';
    html +=
      '  .grid-cell { border-radius: 8px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; container-type: size; overflow: visible; }\n';
    html +=
      '  .grid-quote__inner { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }\n';
    html +=
      '  .grid-quote__text { flex: 1 1 auto; min-height: 0; margin-bottom: ' +
      (styleConfig.grid.quote.marginBottom ?? '0') +
      '; font-family: ' +
      (styleConfig.grid.quote.fontFamily ?? '"Lora", Georgia, serif') +
      '; font-style: ' +
      (styleConfig.grid.quote.fontStyle ?? 'italic') +
      '; text-decoration: none; overflow-wrap: anywhere; hyphens: auto; line-height: var(--grid-quote-line-height, 1.5); ';
    html +=
      'font-size: calc(clamp(12px, 0.8rem + 2.25cqi, 1.28rem) * var(--grid-quote-scale, 1)); }\n';
    html +=
      '  .grid-cell[data-auto-quote="1"] .grid-quote__text { font-size: clamp(12px, min(5.5cqh, 2.75cqi + 0.5rem), 7rem) !important; }\n';
    html +=
      '  .grid-quote__text * { text-decoration: none; border-bottom: none; }\n';
    html +=
      '  @supports not (font-size: 1cqi) { .grid-quote__text { font-size: calc(clamp(12px, 0.88rem + 1.1vw, 1.28rem) * var(--grid-quote-scale, 1)); } }\n';
    html += '  .grid-metadata { ' + gridMetadataBase + ' }\n';
  }

  html += '</style>\n';
  html += '</head>\n<body>\n';

  if (layoutMode === 'stack') {
    html += '<div class="testimonial-stack-embed">\n';
    testimonials.forEach((testimonial) => {
      const metadata = [
        testimonial.year,
        testimonial.country,
        testimonial.age,
        testimonial.state,
        testimonial.visa,
        formatOccupationForDisplay(testimonial.occupation),
      ]
        .filter(Boolean)
        .join(' • ');

      const theme = resolveCardThemeId(globalCardTheme, cardSurfaceOverrides[testimonial.id]);
      const tok = getCardThemeTokens(theme);
      const cardChrome =
        'border-radius: 8px; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; ' +
        `background-color: ${tok.backgroundColor}; border: ${tok.border}; box-shadow: ${tok.boxShadow};`;
      const quoteStyle = `color: ${tok.quoteColor}; font-weight: ${tok.quoteFontWeight};`;
      const metaStyle = `color: ${tok.metadataColor}; font-weight: ${tok.metadataFontWeight}; border-top: 1px solid ${tok.metadataDividerColor};`;

      html += `<div class="testimonial-card" style="${cardChrome}">\n`;
      html +=
        '  <div class="stack-quote" style="' +
        quoteStyle +
        '" lang="en">' +
        escapeHtml(normalizeQuoteForLayout(testimonial.quote)) +
        '</div>\n';
      html +=
        '  <div class="stack-metadata" style="' +
        metaStyle +
        '">' +
        escapeHtml(metadata) +
        '</div>\n';
      html += '</div>\n';
    });
    html += '</div>\n';
  } else {
    const placements = calculateGridLayout(
      testimonials,
      gridDimensions.columns,
      gridSizeOverrides,
      gridDimensions.rows
    );
    const rowCount = placements.length === 0 ? 1 : calculateGridRows(placements);
    const cols = gridDimensions.columns;
    html +=
      '<div class="grid-container" style="grid-template-columns: repeat(' +
      cols +
      ', 1fr); grid-template-rows: repeat(' +
      rowCount +
      ', minmax(6rem, auto));">\n';

    placements.forEach((placement) => {
      const metadata = [
        placement.testimonial.year,
        placement.testimonial.country,
        placement.testimonial.age,
        placement.testimonial.state,
        placement.testimonial.visa,
        formatOccupationForDisplay(placement.testimonial.occupation),
      ]
        .filter(Boolean)
        .join(' • ');
      const fontOverride = fontScaleOverrides[placement.testimonial.id] ?? 'auto';
      const isAutoFont = fontOverride === 'auto';
      const scale = isAutoFont ? 1 : fontOverride;
      const lh = isAutoFont ? AUTO_FIT_LINE_HEIGHT : lineHeightForQuoteScale(fontOverride);
      const quoteText = escapeHtml(normalizeQuoteForLayout(placement.testimonial.quote));
      const theme = resolveCardThemeId(
        globalCardTheme,
        cardSurfaceOverrides[placement.testimonial.id]
      );
      const tok = getCardThemeTokens(theme);
      const cellChrome = `background-color: ${tok.backgroundColor}; border: ${tok.border}; box-shadow: ${tok.boxShadow};`;
      const quoteInline = `color: ${tok.quoteColor}; font-weight: ${tok.quoteFontWeight};`;
      const metaInline = `color: ${tok.metadataColor}; font-weight: ${tok.metadataFontWeight};`;
      html +=
        '  <div class="grid-cell"' +
        (isAutoFont ? ' data-auto-quote="1"' : '') +
        ' style="grid-row: ' +
        placement.gridRow +
        '; grid-column: ' +
        placement.gridColumn +
        '; --grid-quote-scale: ' +
        scale +
        '; --grid-quote-line-height: ' +
        lh +
        '; ' +
        cellChrome +
        '">\n';
      html += '    <div class="grid-quote__inner">\n';
      html +=
        '      <div class="grid-quote__text" lang="en" style="' +
        quoteInline +
        '">' +
        quoteText +
        '</div>\n';
      html += '    </div>\n';
      html +=
        '    <div class="grid-metadata" style="' +
        metaInline +
        '">' +
        escapeHtml(metadata) +
        '</div>\n';
      html += '  </div>\n';
    });

    html += '</div>\n';
  }

  html += '</body>\n</html>';

  return html;
}

/**
 * Escapes HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Removes XML-invalid control characters from text (except tab, newline, carriage return).
 * Prevents parser/Illustrator errors from NUL or other control chars in user content.
 */
function sanitizeSvgTextContent(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/**
 * Escapes a string for use inside a double-quoted SVG/XML attribute.
 * Prevents font-family values like Georgia, "Times New Roman", serif from
 * breaking the attribute (inner " would close the attribute and cause invalid XML).
 */
function escapeSvgAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Word-wraps text using font metrics (getAdvanceWidth) so line breaks match outlined output.
 * Returns lines truncated to maxLines with "..." on last line when over limit.
 */
function wordWrapWithFont(
  text: string,
  font: OpentypeFont,
  fontSizePx: number,
  maxWidthPx: number,
  maxLines: number
): string[] {
  const cleaned = sanitizeSvgTextContent(text);
  const words = cleaned.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    const width = font.getAdvanceWidth(candidate, fontSizePx);
    if (width <= maxWidthPx) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
        if (lines.length >= maxLines) break;
      }
      const wordWidth = font.getAdvanceWidth(word, fontSizePx);
      if (wordWidth <= maxWidthPx) {
        current = word;
      } else {
        for (let i = 0; i < word.length && lines.length < maxLines; ) {
          let end = i + 1;
          while (end <= word.length && font.getAdvanceWidth(word.slice(i, end), fontSizePx) <= maxWidthPx) end++;
          if (end === i) end = i + 1;
          lines.push(word.slice(i, end));
          i = end;
        }
        current = '';
      }
    }
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length > maxLines) {
    const out = lines.slice(0, maxLines);
    out[maxLines - 1] = out[maxLines - 1] + '...';
    return out;
  }
  return lines;
}

/** Max font-size (px) for which wrapped quote lines fit in `quoteAreaHeightPx` (outline SVG grid). */
function autoQuoteFontSizeForGridExport(
  quoteRaw: string,
  font: OpentypeFont,
  textWidthPx: number,
  quoteAreaHeightPx: number,
  lineHeightEm: number
): number {
  const text = normalizeQuoteForLayout(quoteRaw);
  const MIN_PX = 12;
  const MAX_PX = 200;
  let lo = MIN_PX;
  let hi = Math.min(MAX_PX, Math.max(quoteAreaHeightPx * 1.5, MIN_PX + 1));
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const lines = wordWrapWithFont(text, font, mid, textWidthPx, 1000);
    const needed = lines.length * mid * lineHeightEm;
    if (needed <= quoteAreaHeightPx + 0.5) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * Renders wrapped lines as SVG <path> elements (outlined text).
 * opentype.js 1.x Glyph.getPath already outputs y-down (y + (-cmd.y * yScale)), so no flip needed.
 */
function wrappedLinesToPaths(
  lines: string[],
  font: OpentypeFont,
  x: number,
  y: number,
  lineHeightEm: number,
  fontSize: number,
  fill: string
): string {
  if (lines.length === 0) return '';
  const fillAttr = escapeSvgAttr(fill);
  const pathParts: string[] = [];
  let lineY = y;
  for (const line of lines) {
    const path = font.getPath(line, x, lineY, fontSize);
    const d = path.toPathData(2);
    pathParts.push(`<path d="${d}" fill="${fillAttr}"/>`);
    lineY += fontSize * lineHeightEm;
  }
  return pathParts.join('');
}

const SVG_PADDING = 24;
const CARD_GAP = 20;
const INLINE_CARD_HEIGHT = 160;
const GRID_GAP = 16;
const GRID_CELL_WIDTH = 192;
const GRID_CELL_HEIGHT = 200;

const DEFAULT_GRID_DIMENSIONS: GridDimensions = { columns: 4, rows: 4 };

/**
 * Programmatic SVG for Illustrator: rect-based cards, text as outlined paths so sizing
 * and rendering are identical in browser and Illustrator (no live text clipping).
 */
function strokeColorFromCssBorder(border: string): string {
  const t = border.trim();
  const parts = t.split(/\s+/);
  return parts[parts.length - 1] ?? '#cccccc';
}

export async function generateSVG(
  testimonials: Testimonial[],
  layoutMode: LayoutMode,
  gridSizeOverrides?: Record<string, import('../types/testimonial').GridSizeOverride>,
  metadataToggles?: MetadataToggles,
  metadataOrder?: MetadataFieldKey[],
  gridDimensions?: GridDimensions,
  fontScaleOverrides?: Record<string, QuoteFontScaleOverride>,
  globalCardTheme: CardThemeId = 'light',
  cardSurfaceOverrides: Record<string, CardSurfaceOverride> = {}
): Promise<string> {
  const toggles = metadataToggles ?? { ...DEFAULT_METADATA_TOGGLES };
  const order: MetadataFieldKey[] = metadataOrder ?? [...DEFAULT_METADATA_ORDER];
  const overrides = gridSizeOverrides ?? {};
  const gridDims = gridDimensions ?? DEFAULT_GRID_DIMENSIONS;

  function metadataParts(t: Testimonial): string[] {
    return getDisplayedMetadataEntries(t, toggles, order).map((e) => e.value);
  }

  const quoteFontSize = 24;
  const metaFontSize = 14;
  const rx = 8;
  const inlineTextWidth = 800 - SVG_PADDING * 2 - 48;
  const inlineQuoteMaxLines = 3;
  const inlineMetaMaxLines = 2;

  if (testimonials.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="100" viewBox="0 0 800 100">
  <rect width="800" height="100" fill="none"/>
</svg>`;
  }

  const { quote: quoteFont, meta: metaFont } = await loadOutlineFonts();

  if (layoutMode === 'stack') {
    const cardHeight = INLINE_CARD_HEIGHT;
    const width = 800;
    const height = SVG_PADDING * 2 + testimonials.length * (cardHeight + CARD_GAP) - CARD_GAP;
    let y = SVG_PADDING;
    const cardWidth = width - SVG_PADDING * 2;

    const textX = SVG_PADDING + 24;
    const parts: string[] = [];
    testimonials.forEach((t) => {
      const theme = resolveCardThemeId(globalCardTheme, cardSurfaceOverrides[t.id]);
      const tok = getCardThemeTokens(theme);
      const quoteColor = tok.quoteColor;
      const metaColor = tok.metadataColor;
      const cardBg = tok.backgroundColor;
      const cardBorder = strokeColorFromCssBorder(tok.border);
      const meta = metadataParts(t).join(' • ');
      const quoteLines = wordWrapWithFont(
        normalizeQuoteForLayout(t.quote),
        quoteFont,
        quoteFontSize,
        inlineTextWidth,
        inlineQuoteMaxLines
      );
      const metaLines = wordWrapWithFont(meta, metaFont, metaFontSize, inlineTextWidth, inlineMetaMaxLines);
      const quoteSvg = wrappedLinesToPaths(quoteLines, quoteFont, textX, y + 32, 1.6, quoteFontSize, quoteColor);
      const metaY = y + cardHeight - 24 - (metaLines.length - 1) * metaFontSize * 1.5;
      const metaSvg = wrappedLinesToPaths(metaLines, metaFont, textX, metaY, 1.5, metaFontSize, metaColor);
      parts.push(`
  <g>
    <rect x="${SVG_PADDING}" y="${y}" width="${cardWidth}" height="${cardHeight}" fill="${escapeSvgAttr(cardBg)}" stroke="${escapeSvgAttr(cardBorder)}" stroke-width="1" rx="${rx}" ry="${rx}"/>
    ${quoteSvg}
    ${metaSvg}
  </g>`);
      y += cardHeight + CARD_GAP;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="none"/>
${parts.join('')}
</svg>`;
  }

  const placements = calculateGridLayout(
    testimonials,
    gridDims.columns,
    overrides,
    gridDims.rows
  );
  const maxRow = placements.length === 0 ? 1 : Math.max(...placements.map((p) => p.row + p.rowSpan));
  const width = SVG_PADDING * 2 + gridDims.columns * GRID_CELL_WIDTH + (gridDims.columns - 1) * GRID_GAP;
  const height = SVG_PADDING * 2 + maxRow * GRID_CELL_HEIGHT + (maxRow - 1) * GRID_GAP;

    const gridQuoteFontSizeBase = 20;
    const gridMetaFontSize = 12;
  const gridLineHeightMeta = 1.4;
  const gridTextPadding = 24;
  const gridQuoteTop = 36;
  const gridMetaBottom = 24;
  const gridQuoteToMetaGap = 24;
  const gridMetaMaxLines = 4;
  const gridMetaLinesReserved = 2;
  const metadataBlockHeight =
    gridQuoteToMetaGap + gridMetaLinesReserved * gridMetaFontSize * gridLineHeightMeta;

  const gridParts: string[] = [];
  placements.forEach((p) => {
    const x = SVG_PADDING + p.col * (GRID_CELL_WIDTH + GRID_GAP);
    const y = SVG_PADDING + p.row * (GRID_CELL_HEIGHT + GRID_GAP);
    const w = p.colSpan * GRID_CELL_WIDTH + (p.colSpan - 1) * GRID_GAP;
    const h = p.rowSpan * GRID_CELL_HEIGHT + (p.rowSpan - 1) * GRID_GAP;
    const t = p.testimonial;
    const theme = resolveCardThemeId(globalCardTheme, cardSurfaceOverrides[t.id]);
    const tok = getCardThemeTokens(theme);
    const gridQuoteColor = tok.quoteColor;
    const gridMetaColor = tok.metadataColor;
    const meta = metadataParts(t).join(' • ');
    const cellBg = tok.backgroundColor;
    const cardStroke = strokeColorFromCssBorder(tok.border);
    const textWidth = w - gridTextPadding * 2;
    const fontOverride = fontScaleOverrides?.[t.id] ?? 'auto';
    const quoteAreaHeight = h - gridQuoteTop - metadataBlockHeight - gridMetaBottom;
    let quoteFontSize: number;
    let quoteLineHeightEm: number;
    if (fontOverride === 'auto') {
      quoteLineHeightEm = AUTO_FIT_LINE_HEIGHT;
      quoteFontSize = autoQuoteFontSizeForGridExport(
        t.quote,
        quoteFont,
        textWidth,
        quoteAreaHeight,
        quoteLineHeightEm
      );
    } else {
      quoteLineHeightEm = lineHeightForQuoteScale(fontOverride);
      quoteFontSize = gridQuoteFontSizeBase * fontOverride;
    }
    const quoteLines = wordWrapWithFont(
      normalizeQuoteForLayout(t.quote),
      quoteFont,
      quoteFontSize,
      textWidth,
      500
    );
    const metaLines = wordWrapWithFont(meta, metaFont, gridMetaFontSize, textWidth, gridMetaMaxLines);
    const quoteSvg = wrappedLinesToPaths(
      quoteLines,
      quoteFont,
      x + gridTextPadding,
      y + gridQuoteTop,
      quoteLineHeightEm,
      quoteFontSize,
      gridQuoteColor
    );
    const metaY = y + h - gridMetaBottom - (metaLines.length - 1) * gridMetaFontSize * gridLineHeightMeta;
    const metaSvg = wrappedLinesToPaths(
      metaLines,
      metaFont,
      x + gridTextPadding,
      metaY,
      gridLineHeightMeta,
      gridMetaFontSize,
      gridMetaColor
    );
    gridParts.push(`
  <g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${escapeSvgAttr(cellBg)}" stroke="${escapeSvgAttr(cardStroke)}" stroke-width="1" rx="8" ry="8"/>
    ${quoteSvg}
    ${metaSvg}
  </g>`);
  });
  const gridBody = gridParts.join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="none"/>
${gridBody}
</svg>`;
}

/**
 * Downloads content as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies text to clipboard
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
