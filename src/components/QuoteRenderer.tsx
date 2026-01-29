import { useRef } from 'react';
import { CSSProperties } from 'react';
import { useControls, button } from 'leva';
import { Testimonial, LayoutMode, ExportFormat, MetadataToggles, MetadataOrder, GridSizeOverride } from '../types/testimonial';
import { InlineQuote } from './InlineQuote';
import { GridQuote } from './GridQuote';
import { calculateGridLayout } from '../lib/gridLayout';
import { exportToSVG, generateEmbedCode, downloadFile, copyToClipboard } from '../lib/exportUtils';

interface QuoteRendererProps {
  testimonials: Testimonial[];
}

export function QuoteRenderer({ testimonials }: QuoteRendererProps) {
  const renderContainerRef = useRef<HTMLDivElement>(null);

  const gridSizeOptions: GridSizeOverride[] = ['auto', '1x1', '1x2', '2x1', '2x2', '3x1', '3x2', '4x1', '4x2'];
  const gridSizeControlSchema = testimonials.length > 0
    ? testimonials.reduce(
        (acc, _, i) => {
          acc[`Quote ${i + 1}`] = { value: 'auto' as GridSizeOverride, options: gridSizeOptions };
          return acc;
        },
        {} as Record<string, { value: GridSizeOverride; options: GridSizeOverride[] }>
      )
    : {};
  const gridSizeControls = useControls('Grid Size', gridSizeControlSchema);

  const {
    layoutMode,
    exportFormat,
    showYear,
    showCountry,
    showAge,
    showState,
    showVisa,
    showOccupation,
    orderYear,
    orderCountry,
    orderAge,
    orderState,
    orderVisa,
    orderOccupation,
  } = useControls('Layout & metadata', {
    layoutMode: {
      value: 'inline' as LayoutMode,
      options: ['inline', 'grid'],
    },
    exportFormat: {
      value: 'svg' as ExportFormat,
      options: ['svg', 'embed'],
    },
    showYear: { value: true, label: 'Year' },
    showCountry: { value: true, label: 'Country' },
    showAge: { value: true, label: 'Age' },
    showState: { value: true, label: 'State' },
    showVisa: { value: true, label: 'Visa' },
    showOccupation: { value: true, label: 'Occupation' },
    orderYear: { value: 1, min: 1, max: 6, step: 1, label: 'Order: Year' },
    orderCountry: { value: 2, min: 1, max: 6, step: 1, label: 'Order: Country' },
    orderAge: { value: 3, min: 1, max: 6, step: 1, label: 'Order: Age' },
    orderState: { value: 4, min: 1, max: 6, step: 1, label: 'Order: State' },
    orderVisa: { value: 5, min: 1, max: 6, step: 1, label: 'Order: Visa' },
    orderOccupation: { value: 6, min: 1, max: 6, step: 1, label: 'Order: Occupation' },
  });

  const metadataToggles: MetadataToggles = {
    showYear,
    showCountry,
    showAge,
    showState,
    showVisa,
    showOccupation,
  };

  const metadataOrder: MetadataOrder = {
    orderYear,
    orderCountry,
    orderAge,
    orderState,
    orderVisa,
    orderOccupation,
  };

  const gridSizeOverrides: Record<string, GridSizeOverride> = {};
  testimonials.forEach((t, i) => {
    const v = gridSizeControls[`Quote ${i + 1}`];
    if (v && v !== 'auto') gridSizeOverrides[t.id] = v;
  });

  const placements = layoutMode === 'grid' ? calculateGridLayout(testimonials, 4, gridSizeOverrides) : [];

  const smallCellPlacements = placements.filter(
    (p) =>
      p.testimonial.quote.length > 600 &&
      ((p.rowSpan === 1 && p.colSpan <= 2) || (p.rowSpan <= 2 && p.colSpan === 1))
  );
  const readabilityWarning =
    smallCellPlacements.length > 0
      ? `Quotes ${smallCellPlacements.map((p) => testimonials.indexOf(p.testimonial) + 1).join(', ')} may be difficult to read at this size.`
      : '';

  useControls('Readability', () => ({
    '⚠️ Warning': { value: readabilityWarning },
  }));

  // Export controls registered last so they appear at bottom of Leva panel
  useControls('Export', {
    'Export SVG': button(async () => {
      if (!renderContainerRef.current) {
        alert('No content to export');
        return;
      }
      try {
        const svgString = await exportToSVG(renderContainerRef.current, testimonials, layoutMode);
        downloadFile(svgString, 'testimonials.svg', 'image/svg+xml');
      } catch (error) {
        alert('Failed to export SVG: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }),
    'Copy Embed Code': button(async () => {
      try {
        const embedCode = generateEmbedCode(testimonials, layoutMode);
        await copyToClipboard(embedCode);
        alert('Embed code copied to clipboard!');
      } catch (error) {
        alert('Failed to generate embed code: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }),
    'Download HTML': button(() => {
      const embedCode = generateEmbedCode(testimonials, layoutMode);
      downloadFile(embedCode, 'testimonials.html', 'text/html');
    }),
  });

  if (testimonials.length === 0) {
    return <div>No testimonials to display</div>;
  }

  return (
    <>
      <div ref={renderContainerRef}>
        {layoutMode === 'inline' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {testimonials.map((testimonial) => (
              <InlineQuote 
                key={testimonial.id} 
                testimonial={testimonial} 
                metadataToggles={metadataToggles}
                metadataOrder={metadataOrder}
              />
            ))}
          </div>
        ) : (
          (() => {
            try {
              const gridContainerStyle: CSSProperties = {
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridAutoRows: 'auto',
                gap: '1rem',
                width: '100%',
              };

              return (
                <div style={gridContainerStyle}>
                  {placements.map((placement) => (
                    <GridQuote
                      key={placement.testimonial.id}
                      testimonial={placement.testimonial}
                      gridRow={placement.gridRow}
                      gridColumn={placement.gridColumn}
                      rowSpan={placement.rowSpan}
                      colSpan={placement.colSpan}
                      metadataToggles={metadataToggles}
                      metadataOrder={metadataOrder}
                    />
                  ))}
                </div>
              );
            } catch (error) {
              console.error('Grid layout error:', error);
              return <div>Error rendering grid layout</div>;
            }
          })()
        )}
      </div>
    </>
  );
}
