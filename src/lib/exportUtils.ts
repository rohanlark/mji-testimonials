import { elementToSVG, inlineResources } from 'dom-to-svg';
import { CSSProperties } from 'react';
import { Testimonial, LayoutMode } from '../types/testimonial';
import { calculateGridLayout } from './gridLayout';
import { styleConfig } from './styleConfig';

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
  testimonials: Testimonial[],
  layoutMode: LayoutMode
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
  layoutMode: LayoutMode
): string {
  // Generate inline styles from styleConfig
  const inlineStyles = cssObjectToString(styleConfig.inline.quote);
  const metadataStyles = cssObjectToString(styleConfig.inline.metadata);
  const gridCellStyles = cssObjectToString(styleConfig.grid.cell);
  const gridQuoteStyles = cssObjectToString(styleConfig.grid.quote);
  const gridMetadataStyles = cssObjectToString(styleConfig.grid.metadata);
  
  let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
  html += '<meta charset="UTF-8">\n';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  html += '<title>MJI Testimonials</title>\n';
  html += '<style>\n';
  html += '  * { margin: 0; padding: 0; box-sizing: border-box; }\n';
  html += '  body { font-family: ' + styleConfig.typography.fontFamily + '; padding: 20px; background: ' + styleConfig.colors.background + '; }\n';
  
  if (layoutMode === 'inline') {
    html += '  .testimonial { margin-bottom: 2rem; }\n';
    html += '  .quote { ' + inlineStyles + ' }\n';
    html += '  .metadata { ' + metadataStyles + ' }\n';
  } else {
    html += '  .grid-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }\n';
    html += '  .grid-cell { ' + gridCellStyles + ' }\n';
    html += '  .grid-quote { ' + gridQuoteStyles + ' }\n';
    html += '  .grid-metadata { ' + gridMetadataStyles + ' }\n';
  }
  
  html += '</style>\n';
  html += '</head>\n<body>\n';
  
  if (layoutMode === 'inline') {
    testimonials.forEach((testimonial) => {
      const metadata = [
        testimonial.year,
        testimonial.country,
        testimonial.age,
        testimonial.state,
        testimonial.visa,
        testimonial.occupation,
      ].filter(Boolean).join(' • ');
      
      html += '<div class="testimonial">\n';
      html += '  <div class="quote">' + escapeHtml(testimonial.quote) + '</div>\n';
      html += '  <div class="metadata">' + escapeHtml(metadata) + '</div>\n';
      html += '</div>\n';
    });
  } else {
    const placements = calculateGridLayout(testimonials, 4);
    
    html += '<div class="grid-container" style="grid-auto-rows: auto;">\n';
    
    placements.forEach((placement) => {
      const metadata = [
        placement.testimonial.year,
        placement.testimonial.country,
        placement.testimonial.age,
        placement.testimonial.state,
        placement.testimonial.visa,
        placement.testimonial.occupation,
      ].filter(Boolean).join(' • ');
      
      html += '  <div class="grid-cell" style="grid-row: ' + placement.gridRow + '; grid-column: ' + placement.gridColumn + ';">\n';
      html += '    <div class="grid-quote">' + escapeHtml(placement.testimonial.quote) + '</div>\n';
      html += '    <div class="grid-metadata">' + escapeHtml(metadata) + '</div>\n';
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
