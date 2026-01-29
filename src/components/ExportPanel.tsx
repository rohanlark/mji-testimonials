import { useControls, button } from 'leva';
import { Testimonial, LayoutMode, ExportFormat } from '../types/testimonial';
import { exportToSVG, generateEmbedCode, downloadFile, copyToClipboard } from '../lib/exportUtils';

interface ExportPanelProps {
  testimonials: Testimonial[];
  layoutMode: LayoutMode;
  exportFormat: ExportFormat;
  renderContainerRef: React.RefObject<HTMLDivElement>;
}

export function ExportPanel({
  testimonials,
  layoutMode,
  exportFormat,
  renderContainerRef,
}: ExportPanelProps) {
  const handleSVGExport = async () => {
    if (!renderContainerRef.current) {
      alert('No content to export');
      return;
    }

    try {
      const svgString = await exportToSVG(
        renderContainerRef.current,
        testimonials,
        layoutMode
      );
      downloadFile(svgString, 'testimonials.svg', 'image/svg+xml');
    } catch (error) {
      alert('Failed to export SVG: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleEmbedCode = async () => {
    try {
      const embedCode = generateEmbedCode(testimonials, layoutMode);
      
      if (exportFormat === 'embed') {
        // Copy to clipboard
        await copyToClipboard(embedCode);
        alert('Embed code copied to clipboard!');
      } else {
        // Download as HTML file
        downloadFile(embedCode, 'testimonials.html', 'text/html');
      }
    } catch (error) {
      alert('Failed to generate embed code: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  useControls('Export', {
    'Export SVG': button(handleSVGExport),
    'Copy Embed Code': button(handleEmbedCode),
    'Download HTML': button(() => {
      const embedCode = generateEmbedCode(testimonials, layoutMode);
      downloadFile(embedCode, 'testimonials.html', 'text/html');
    }),
  });

  return null; // Leva handles the UI
}
