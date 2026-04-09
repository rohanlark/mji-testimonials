import { useState, useRef } from 'react';
import { CSSProperties } from 'react';
import {
  Testimonial,
  LayoutMode,
  MetadataToggles,
  MetadataFieldKey,
  DEFAULT_METADATA_ORDER,
  DEFAULT_METADATA_TOGGLES,
  GridSizeOverride,
  QuoteFontScaleOverride,
  GridDimensions,
  GridAspectRatio,
  CardThemeId,
  CardSurfaceOverride,
} from '../types/testimonial';
import { resolveCardThemeId } from '../lib/cardThemes';
import { GridQuote } from './GridQuote';
import { Sidebar } from './Sidebar';
import { QuoteEditModal } from './QuoteEditModal';
import {
  calculateGridLayout,
  calculateGridRows,
  sortPlacementsReadingOrder,
  countVacantUnitCells,
} from '../lib/gridLayout';
import { normalizeQuoteForLayout } from '../lib/quoteNormalize';
import { exportToSVG, generateEmbedCode, downloadFile, copyToClipboard } from '../lib/exportUtils';

export interface TestimonialPreviewProps {
  testimonials: Testimonial[];
  layoutMode: LayoutMode;
  metadataToggles: MetadataToggles;
  metadataOrder: MetadataFieldKey[];
  gridDimensions?: GridDimensions;
  gridSizeOverrides: Record<string, GridSizeOverride>;
  fontScaleOverrides?: Record<string, QuoteFontScaleOverride>;
  selectedQuoteId?: string | null;
  onSelectQuote?: (id: string | null) => void;
  onUpdateTestimonial?: (id: string, partial: Partial<Testimonial>) => void;
  /** Open the quote editor modal (e.g. double-click a card). Same for grid and stack. */
  onRequestEditQuote?: (id: string) => void;
  /** When true, draw faint column/row guides (track boundaries) behind the grid. */
  showGridLines?: boolean;
  globalCardTheme?: CardThemeId;
  cardSurfaceOverrides?: Record<string, CardSurfaceOverride>;
}

/** Renders only the testimonial preview (stack or grid). Used when layout is main | sidebar. */
export function TestimonialPreview({
  testimonials,
  layoutMode,
  metadataToggles,
  metadataOrder,
  gridDimensions = { columns: 3, rows: 3 },
  gridSizeOverrides,
  fontScaleOverrides = {},
  selectedQuoteId,
  onSelectQuote,
  onUpdateTestimonial,
  onRequestEditQuote,
  showGridLines = false,
  globalCardTheme = 'light',
  cardSurfaceOverrides = {},
}: TestimonialPreviewProps) {
  const placements =
    layoutMode === 'grid'
      ? calculateGridLayout(
          testimonials,
          gridDimensions.columns,
          gridSizeOverrides,
          gridDimensions.rows
        )
      : [];

  if (layoutMode === 'stack') {
    return (
      <div className="testimonial-stack">
        {testimonials.map((testimonial) => (
          <GridQuote
            key={testimonial.id}
            testimonial={testimonial}
            rowSpan={1}
            colSpan={1}
            metadataToggles={metadataToggles}
            metadataOrder={metadataOrder}
            onUpdateTestimonial={onUpdateTestimonial}
            onRequestEdit={onUpdateTestimonial ? onRequestEditQuote : undefined}
            fontScaleOverride={fontScaleOverrides[testimonial.id]}
            cardTheme={resolveCardThemeId(globalCardTheme, cardSurfaceOverrides[testimonial.id])}
            quoteVariant="stack"
            onSelect={
              onSelectQuote
                ? () =>
                    onSelectQuote(selectedQuoteId === testimonial.id ? null : testimonial.id)
                : undefined
            }
            isSelected={selectedQuoteId === testimonial.id}
          />
        ))}
      </div>
    );
  }

  try {
    const rowCount = placements.length === 0 ? 1 : calculateGridRows(placements);
    const cols = gridDimensions.columns;
    const trackOverlayStyle: CSSProperties = {
      display: 'grid',
      gridTemplateColumns: 'subgrid',
      gridTemplateRows: 'subgrid',
      gridColumn: '1 / -1',
      gridRow: '1 / -1',
      pointerEvents: 'none',
      zIndex: 0,
      minWidth: 0,
      minHeight: 0,
    };

    const gridContainerStyle: CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      // Auto-growing rows: content sets height; floor keeps rhythm (preview may scroll inside aspect wrapper).
      gridTemplateRows: `repeat(${rowCount}, minmax(6rem, auto))`,
      gap: '1rem',
      width: '100%',
      minHeight: 0,
      alignContent: 'start',
    };

    return (
      <div
        className={showGridLines ? 'testimonial-grid testimonial-grid--lines' : 'testimonial-grid'}
        style={gridContainerStyle}
      >
        {showGridLines ? (
          <div className="testimonial-grid__track-overlay" style={trackOverlayStyle} aria-hidden>
            {Array.from({ length: rowCount * cols }, (_, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              return (
                <div
                  key={i}
                  className="testimonial-grid__track-cell"
                  style={{
                    borderRight:
                      col < cols - 1 ? '1px solid rgba(0, 0, 0, 0.14)' : undefined,
                    borderBottom:
                      row < rowCount - 1 ? '1px solid rgba(0, 0, 0, 0.14)' : undefined,
                  }}
                />
              );
            })}
          </div>
        ) : null}
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
            onUpdateTestimonial={onUpdateTestimonial}
            onRequestEdit={onUpdateTestimonial ? onRequestEditQuote : undefined}
            fontScaleOverride={fontScaleOverrides[placement.testimonial.id]}
            cardTheme={resolveCardThemeId(
              globalCardTheme,
              cardSurfaceOverrides[placement.testimonial.id]
            )}
            quoteVariant="grid"
            onSelect={
              onSelectQuote
                ? () =>
                    onSelectQuote(
                      selectedQuoteId === placement.testimonial.id
                        ? null
                        : placement.testimonial.id
                    )
                : undefined
            }
            isSelected={selectedQuoteId === placement.testimonial.id}
          />
        ))}
      </div>
    );
  } catch (error) {
    console.error('Grid layout error:', error);
    return <div>Error rendering grid layout</div>;
  }
}

interface QuoteRendererProps {
  testimonials: Testimonial[];
  onReorderQuotes?: (newOrder: Testimonial[]) => void;
  onUpdateTestimonial?: (id: string, partial: Partial<Testimonial>) => void;
}

export function QuoteRenderer({ testimonials, onReorderQuotes, onUpdateTestimonial }: QuoteRendererProps) {
  const renderContainerRef = useRef<HTMLDivElement>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [metadataToggles, setMetadataToggles] = useState<MetadataToggles>(DEFAULT_METADATA_TOGGLES);
  const [metadataOrder, setMetadataOrder] = useState<MetadataFieldKey[]>([...DEFAULT_METADATA_ORDER]);
  const [gridSizeOverrides, setGridSizeOverrides] = useState<Record<string, GridSizeOverride>>({});
  const [fontScaleOverrides, setFontScaleOverrides] = useState<Record<string, QuoteFontScaleOverride>>({});
  const [gridAspectRatio, setGridAspectRatio] = useState<GridAspectRatio>('fit');
  const [gridAspectRatioFlipped, setGridAspectRatioFlipped] = useState(false);
  const [gridDimensions, setGridDimensions] = useState<GridDimensions>({ columns: 3, rows: 3 });
  const [showGridLines, setShowGridLines] = useState(false);
  const [globalCardTheme, setGlobalCardTheme] = useState<CardThemeId>('light');
  const [cardSurfaceOverrides, setCardSurfaceOverrides] = useState<
    Record<string, CardSurfaceOverride>
  >({});
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  const editingTestimonial =
    editingQuoteId !== null ? testimonials.find((t) => t.id === editingQuoteId) ?? null : null;

  const setGridSizeOverride = (testimonialId: string, size: GridSizeOverride) => {
    setGridSizeOverrides((prev) => {
      if (size === 'auto') {
        const next = { ...prev };
        delete next[testimonialId];
        return next;
      }
      return { ...prev, [testimonialId]: size };
    });
  };

  const setFontScaleOverride = (testimonialId: string, scale: QuoteFontScaleOverride) => {
    setFontScaleOverrides((prev) => {
      if (scale === 'auto') {
        const next = { ...prev };
        delete next[testimonialId];
        return next;
      }
      return { ...prev, [testimonialId]: scale };
    });
  };

  const setCardSurfaceOverride = (testimonialId: string, surface: CardSurfaceOverride) => {
    setCardSurfaceOverrides((prev) => {
      if (surface === 'inherit') {
        const next = { ...prev };
        delete next[testimonialId];
        return next;
      }
      return { ...prev, [testimonialId]: surface };
    });
  };

  const setMetadataToggle = (field: keyof MetadataToggles, value: boolean) => {
    setMetadataToggles((prev) => ({ ...prev, [field]: value }));
  };

  const placements =
    layoutMode === 'grid'
      ? calculateGridLayout(
          testimonials,
          gridDimensions.columns,
          gridSizeOverrides,
          gridDimensions.rows
        )
      : [];
  const readingOrderPlacements = sortPlacementsReadingOrder(placements);
  const sidebarQuoteIndex = (testimonialId: string) =>
    readingOrderPlacements.findIndex((p) => p.testimonial.id === testimonialId) + 1;

  const smallCellPlacements = placements.filter((p) => {
    const len = normalizeQuoteForLayout(p.testimonial.quote).length;
    return (
      len > 600 &&
      ((p.rowSpan === 1 && p.colSpan <= 2) || (p.rowSpan <= 2 && p.colSpan === 1))
    );
  });
  const readabilityWarning =
    smallCellPlacements.length > 0
      ? `Quotes ${smallCellPlacements.map((p) => sidebarQuoteIndex(p.testimonial.id)).join(', ')} are long for their cell size. Shorten the quote, or increase the grid size / font scale for those rows in the sidebar.`
      : '';

  const vacantCells =
    layoutMode === 'grid' && placements.length > 0
      ? countVacantUnitCells(placements, gridDimensions.columns)
      : 0;
  const gridVacancyWarning =
    vacantCells > 0
      ? `${vacantCells} empty grid cell${vacantCells === 1 ? '' : 's'} (first-fit packing can’t always tessellate). Reorder quotes or change cell sizes to reduce gaps.`
      : '';

  const handleExportSVG = async () => {
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
  };

  const handleCopyEmbed = async () => {
    try {
      const embedCode = generateEmbedCode(
        testimonials,
        layoutMode,
        gridDimensions,
        gridSizeOverrides,
        fontScaleOverrides,
        globalCardTheme,
        cardSurfaceOverrides
      );
      await copyToClipboard(embedCode);
      alert('Embed code copied to clipboard!');
    } catch (error) {
      alert('Failed to generate embed code: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDownloadHTML = () => {
    const embedCode = generateEmbedCode(
      testimonials,
      layoutMode,
      gridDimensions,
      gridSizeOverrides,
      fontScaleOverrides,
      globalCardTheme,
      cardSurfaceOverrides
    );
    downloadFile(embedCode, 'testimonials.html', 'text/html');
  };

  const handleReorderQuotes = onReorderQuotes ?? (() => {});
  const shuffleQuotes = () => {
    const shuffled = [...testimonials].sort(() => Math.random() - 0.5);
    handleReorderQuotes(shuffled);
  };

  if (testimonials.length === 0) {
    return <div>No testimonials to display</div>;
  }

  return (
    <div className="renderer-with-sidebar">
      <div
        ref={renderContainerRef}
        className="renderer-preview"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('.grid-quote')) return;
          setSelectedQuoteId(null);
        }}
      >
        <TestimonialPreview
          testimonials={testimonials}
          layoutMode={layoutMode}
          metadataToggles={metadataToggles}
          metadataOrder={metadataOrder}
          gridDimensions={gridDimensions}
          gridSizeOverrides={gridSizeOverrides}
          fontScaleOverrides={fontScaleOverrides}
          globalCardTheme={globalCardTheme}
          cardSurfaceOverrides={cardSurfaceOverrides}
          selectedQuoteId={selectedQuoteId}
          onSelectQuote={setSelectedQuoteId}
          onUpdateTestimonial={onUpdateTestimonial}
          onRequestEditQuote={onUpdateTestimonial ? (id) => setEditingQuoteId(id) : undefined}
          showGridLines={showGridLines}
        />
      </div>
      {onUpdateTestimonial ? (
        <QuoteEditModal
          testimonial={editingTestimonial}
          open={editingQuoteId !== null}
          onClose={() => setEditingQuoteId(null)}
          onSave={(id, partial) => onUpdateTestimonial(id, partial)}
        />
      ) : null}
      <Sidebar
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        gridAspectRatio={gridAspectRatio}
        setGridAspectRatio={setGridAspectRatio}
        gridAspectRatioFlipped={gridAspectRatioFlipped}
        setGridAspectRatioFlipped={setGridAspectRatioFlipped}
        gridDimensions={gridDimensions}
        setGridDimensions={setGridDimensions}
        testimonials={testimonials}
        onReorderQuotes={handleReorderQuotes}
        onShuffleQuotes={shuffleQuotes}
        gridSizeOverrides={gridSizeOverrides}
        setGridSizeOverride={setGridSizeOverride}
        fontScaleOverrides={fontScaleOverrides}
        setFontScaleOverride={setFontScaleOverride}
        globalCardTheme={globalCardTheme}
        setGlobalCardTheme={setGlobalCardTheme}
        cardSurfaceOverrides={cardSurfaceOverrides}
        setCardSurfaceOverride={setCardSurfaceOverride}
        selectedQuoteId={selectedQuoteId}
        onSelectQuote={setSelectedQuoteId}
        onEditSelectedQuote={
          onUpdateTestimonial
            ? () => {
                if (selectedQuoteId) setEditingQuoteId(selectedQuoteId);
              }
            : undefined
        }
        metadataOrder={metadataOrder}
        setMetadataOrder={setMetadataOrder}
        metadataToggles={metadataToggles}
        setMetadataToggle={setMetadataToggle}
        readabilityWarning={readabilityWarning}
        gridVacancyWarning={gridVacancyWarning}
        showGridLines={showGridLines}
        setShowGridLines={setShowGridLines}
        onExportSVG={handleExportSVG}
        onCopyEmbed={handleCopyEmbed}
        onDownloadHTML={handleDownloadHTML}
      />
    </div>
  );
}
