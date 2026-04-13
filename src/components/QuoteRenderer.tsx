import { useState, useRef, useMemo, useCallback, useEffect, type ReactNode } from 'react';
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
  CardSurfaceOverride,
  GlobalCardThemeId,
  MobileFallbackMode,
  clampGridSizeOverride,
} from '../types/testimonial';
import { resolveCardThemeId } from '../lib/cardThemes';
import {
  GridQuote,
  type GridQuoteResizeControl,
  type GridQuoteAppearanceControl,
} from './GridQuote';
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
import { CarouselDeckLayout } from './CarouselDeckLayout';
import { RevealDeckLayout } from './RevealDeckLayout';
import {
  DEFAULT_CARD_PADDING_PX,
  DEFAULT_LAYOUT_GAP_PX,
  DEFAULT_LAYOUT_MARGIN_PX,
} from '../lib/layoutSpacing';
import { getResponsiveLayoutPolicy } from '../lib/responsiveLayoutPolicy';

export function DefaultRevealDeckContent() {
  return (
    <div className="deck-reveal__placeholder">
      <p className="deck-reveal__stat">92%</p>
      <p className="deck-reveal__lede">Year-one retention among workers who completed the programme (spike placeholder).</p>
    </div>
  );
}

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
  globalCardTheme?: GlobalCardThemeId;
  cardSurfaceOverrides?: Record<string, CardSurfaceOverride>;
  /** When set, selected grid cards get edge resize handles and commits update per-quote grid size. */
  onGridSizeChange?: (testimonialId: string, size: GridSizeOverride) => void;
  /** When set, selected cards show on-card text scale control. */
  onFontScaleChange?: (testimonialId: string, scale: QuoteFontScaleOverride) => void;
  /** When set, selected cards show on-card surface (colour) control. */
  onCardSurfaceChange?: (testimonialId: string, surface: CardSurfaceOverride) => void;
  /** When true, quote text may hyphenate across line breaks. */
  quoteHyphenation?: boolean;
  /** Carousel deck: optional autoplay (pauses on hover / focus inside deck). */
  carouselAutoplay?: boolean;
  /** Reveal deck: content shown after all cards are dismissed. */
  revealDeckContent?: ReactNode;
  /** Space between cards (grid `gap` and stack flex gap). */
  layoutGapPx?: number;
  /** Padding inset around the whole grid/stack inside the preview. */
  layoutMarginPx?: number;
  /** Padding inside each card before quote and metadata. */
  cardPaddingPx?: number;
  /** When true, force grid tracks to fit a fixed-height preview frame (no outer scroll). */
  fitGridToFrame?: boolean;
  /** Responsive behavior for very small viewports. */
  mobileFallbackMode?: MobileFallbackMode;
  /** Swipe-rail card width in viewport percent (75–85). */
  swipeCardWidthPct?: number;
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
  onGridSizeChange,
  onFontScaleChange,
  onCardSurfaceChange,
  quoteHyphenation = false,
  carouselAutoplay = false,
  revealDeckContent,
  layoutGapPx = DEFAULT_LAYOUT_GAP_PX,
  layoutMarginPx = DEFAULT_LAYOUT_MARGIN_PX,
  cardPaddingPx = DEFAULT_CARD_PADDING_PX,
  fitGridToFrame = false,
  mobileFallbackMode = 'stack',
  swipeCardWidthPct = 78,
}: TestimonialPreviewProps) {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const layoutShellRef = useRef<HTMLDivElement>(null);
  const swipeRailRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [resizePreview, setResizePreview] = useState<{
    id: string;
    size: GridSizeOverride;
  } | null>(null);
  const [resizeLinesActive, setResizeLinesActive] = useState(false);

  const effectiveGridSizeOverrides = useMemo(() => {
    if (!resizePreview) return gridSizeOverrides;
    return { ...gridSizeOverrides, [resizePreview.id]: resizePreview.size };
  }, [gridSizeOverrides, resizePreview]);

  useEffect(() => {
    const el = layoutShellRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth || 1200);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const responsive = useMemo(
    () =>
      getResponsiveLayoutPolicy({
        widthPx: containerWidth,
        baseGapPx: layoutGapPx,
        baseCardPaddingPx: cardPaddingPx,
        requestedGridDimensions: gridDimensions,
        mobileFallbackMode,
        swipeCardWidthPct,
        testimonials,
      }),
    [
      containerWidth,
      layoutGapPx,
      cardPaddingPx,
      gridDimensions,
      mobileFallbackMode,
      swipeCardWidthPct,
      testimonials,
    ]
  );

  const effectiveLayoutGapPx = responsive.effectiveGapPx;
  const effectiveCardPaddingPx = responsive.effectiveCardPaddingPx;
  const effectiveGridDimensions = responsive.effectiveGridDimensions;
  const showSwipeRail = responsive.useMobileFallback && responsive.resolvedMobileMode === 'swipe';
  const shouldRenderStack = layoutMode === 'stack' || (layoutMode === 'grid' && responsive.useMobileFallback && !showSwipeRail);

  const handleSwipeRailKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const rail = swipeRailRef.current;
      if (!rail) return;
      const delta = Math.round(rail.clientWidth * 0.82);
      rail.scrollBy({
        left: e.key === 'ArrowRight' ? delta : -delta,
        behavior: 'smooth',
      });
      e.preventDefault();
    },
    []
  );

  const handleResizePreview = useCallback(
    (testimonialId: string, size: GridSizeOverride | null) => {
      setResizePreview((prev) => {
        if (size === null) return prev?.id === testimonialId ? null : prev;
        return { id: testimonialId, size };
      });
    },
    []
  );

  const handleResizeCommit = useCallback(
    (testimonialId: string, size: GridSizeOverride) => {
      onGridSizeChange?.(testimonialId, size);
    },
    [onGridSizeChange]
  );

  const makeAppearanceControl = useCallback(
    (testimonialId: string): GridQuoteAppearanceControl | undefined => {
      if (!onFontScaleChange || !onCardSurfaceChange) return undefined;
      return {
        fontScale: fontScaleOverrides[testimonialId] ?? 'auto',
        onFontScaleChange: (scale) => onFontScaleChange(testimonialId, scale),
        cardSurface: cardSurfaceOverrides[testimonialId] ?? 'inherit',
        onCardSurfaceChange: (surface) =>
          onCardSurfaceChange(testimonialId, surface),
      };
    },
    [
      fontScaleOverrides,
      cardSurfaceOverrides,
      onFontScaleChange,
      onCardSurfaceChange,
    ]
  );

  const responsiveGridSizeOverrides = useMemo(() => {
    const next: Record<string, GridSizeOverride> = {};
    for (const [id, size] of Object.entries(effectiveGridSizeOverrides)) {
      const clamped = clampGridSizeOverride(size, effectiveGridDimensions);
      if (clamped !== 'auto') next[id] = clamped;
    }
    return next;
  }, [effectiveGridSizeOverrides, effectiveGridDimensions]);

  const placements =
    layoutMode === 'grid'
      ? calculateGridLayout(
          testimonials,
          effectiveGridDimensions.columns,
          responsiveGridSizeOverrides,
          effectiveGridDimensions.rows
        )
      : [];

  if (shouldRenderStack) {
    return (
      <div
        ref={layoutShellRef}
        className="testimonial-layout-shell"
        style={{
          boxSizing: 'border-box',
          width: '100%',
          padding: layoutMarginPx,
        }}
      >
        <div
          className="testimonial-stack"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: effectiveLayoutGapPx,
            width: '100%',
          }}
        >
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
              quoteHyphenation={quoteHyphenation}
              cardPaddingPx={effectiveCardPaddingPx}
              onSelect={
                onSelectQuote
                  ? () =>
                      onSelectQuote(selectedQuoteId === testimonial.id ? null : testimonial.id)
                  : undefined
              }
              isSelected={selectedQuoteId === testimonial.id}
              appearanceControl={makeAppearanceControl(testimonial.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (layoutMode === 'grid' && showSwipeRail) {
    return (
      <div
        ref={layoutShellRef}
        className="testimonial-layout-shell"
        style={{
          boxSizing: 'border-box',
          width: '100%',
          padding: layoutMarginPx,
        }}
      >
        <div
          ref={swipeRailRef}
          className="testimonial-swipe-rail"
          role="list"
          aria-label="Swipe testimonials"
          tabIndex={0}
          onKeyDown={handleSwipeRailKeyDown}
          style={
            {
              ['--rail-gap' as string]: `${effectiveLayoutGapPx}px`,
              ['--rail-card-width' as string]: `${responsive.swipeCardWidthPct}vw`,
            } as CSSProperties
          }
        >
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="testimonial-swipe-rail__item"
              role="listitem"
            >
              <GridQuote
                testimonial={testimonial}
                rowSpan={1}
                colSpan={1}
                metadataToggles={metadataToggles}
                metadataOrder={metadataOrder}
                onUpdateTestimonial={onUpdateTestimonial}
                onRequestEdit={onUpdateTestimonial ? onRequestEditQuote : undefined}
                fontScaleOverride={fontScaleOverrides[testimonial.id]}
                cardTheme={resolveCardThemeId(globalCardTheme, cardSurfaceOverrides[testimonial.id])}
                quoteHyphenation={quoteHyphenation}
                cardPaddingPx={effectiveCardPaddingPx}
                onSelect={
                  onSelectQuote
                    ? () =>
                        onSelectQuote(selectedQuoteId === testimonial.id ? null : testimonial.id)
                    : undefined
                }
                isSelected={selectedQuoteId === testimonial.id}
                appearanceControl={makeAppearanceControl(testimonial.id)}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layoutMode === 'carousel_deck') {
    return (
      <CarouselDeckLayout
        testimonials={testimonials}
        metadataToggles={metadataToggles}
        metadataOrder={metadataOrder}
        globalCardTheme={globalCardTheme}
        selectedQuoteId={selectedQuoteId}
        onSelectQuote={onSelectQuote}
        onUpdateTestimonial={onUpdateTestimonial}
        onRequestEditQuote={onRequestEditQuote}
        quoteHyphenation={quoteHyphenation}
        autoplay={carouselAutoplay}
      />
    );
  }

  if (layoutMode === 'reveal_deck') {
    return (
      <RevealDeckLayout
        testimonials={testimonials}
        metadataToggles={metadataToggles}
        metadataOrder={metadataOrder}
        globalCardTheme={globalCardTheme}
        onSelectQuote={onSelectQuote}
        onUpdateTestimonial={onUpdateTestimonial}
        onRequestEditQuote={onRequestEditQuote}
        quoteHyphenation={quoteHyphenation}
        revealContent={revealDeckContent ?? <DefaultRevealDeckContent />}
      />
    );
  }

  try {
    const rowCount = placements.length === 0 ? 1 : calculateGridRows(placements);
    const cols = effectiveGridDimensions.columns;
    const showTrackLines = showGridLines || resizeLinesActive;

    const gridResizeControl: GridQuoteResizeControl | undefined = onGridSizeChange
      ? {
          containerRef: gridContainerRef,
          packingRowCount: rowCount,
          dimensions: effectiveGridDimensions,
          onPreview: handleResizePreview,
          onLinesActive: setResizeLinesActive,
          onCommit: handleResizeCommit,
        }
      : undefined;
    const trackOverlayStyle: CSSProperties = {
      display: 'grid',
      gridTemplateColumns: 'subgrid',
      gridTemplateRows: 'subgrid',
      gridColumn: '1 / -1',
      gridRow: '1 / -1',
      pointerEvents: 'none',
      zIndex: 8,
      minWidth: 0,
      minHeight: 0,
      ['--grid-track-gap' as string]: `${effectiveLayoutGapPx}px`,
      ['--grid-track-line-color' as string]: 'rgba(0, 0, 0, 0.18)',
    };

    const gridContainerStyle: CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      // Fit-mode preserves content-driven row height; fixed-frame mode compresses rows to frame height.
      gridTemplateRows: fitGridToFrame
        ? `repeat(${rowCount}, minmax(0, 1fr))`
        : `repeat(${rowCount}, minmax(6rem, auto))`,
      gap: effectiveLayoutGapPx,
      width: '100%',
      height: fitGridToFrame ? '100%' : undefined,
      minHeight: 0,
      alignContent: 'start',
    };

    return (
      <div
        ref={layoutShellRef}
        className="testimonial-layout-shell"
        style={{
          boxSizing: 'border-box',
          width: '100%',
          padding: layoutMarginPx,
        }}
      >
      <div
        ref={gridContainerRef}
        className={
          showTrackLines ? 'testimonial-grid testimonial-grid--lines' : 'testimonial-grid'
        }
        style={gridContainerStyle}
      >
        {showTrackLines ? (
          <div className="testimonial-grid__track-overlay" style={trackOverlayStyle} aria-hidden>
            {Array.from({ length: rowCount * cols }, (_, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              return (
                <div
                  key={i}
                  className={[
                    'testimonial-grid__track-cell',
                    col < cols - 1 ? 'testimonial-grid__track-cell--v' : '',
                    row < rowCount - 1 ? 'testimonial-grid__track-cell--h' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
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
            quoteHyphenation={quoteHyphenation}
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
            gridResize={gridResizeControl}
            appearanceControl={makeAppearanceControl(placement.testimonial.id)}
            cardPaddingPx={effectiveCardPaddingPx}
          />
        ))}
      </div>
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
  const [quoteHyphenation, setQuoteHyphenation] = useState(false);
  const [globalCardTheme, setGlobalCardTheme] = useState<GlobalCardThemeId>('light');
  const [cardSurfaceOverrides, setCardSurfaceOverrides] = useState<
    Record<string, CardSurfaceOverride>
  >({});
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [layoutGapPx, setLayoutGapPx] = useState(DEFAULT_LAYOUT_GAP_PX);
  const [cardPaddingPx, setCardPaddingPx] = useState(DEFAULT_CARD_PADDING_PX);
  const [mobileFallbackMode, setMobileFallbackMode] = useState<MobileFallbackMode>('swipe');
  const [swipeCardWidthPct, setSwipeCardWidthPct] = useState(78);

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
      ? `Quotes ${smallCellPlacements.map((p) => sidebarQuoteIndex(p.testimonial.id)).join(', ')} are long for their cell size. Shorten the quote, increase the grid size, or reduce text size on the selected card.`
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
        cardSurfaceOverrides,
        quoteHyphenation,
        layoutGapPx,
        DEFAULT_LAYOUT_MARGIN_PX,
        cardPaddingPx
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
      cardSurfaceOverrides,
      quoteHyphenation,
      layoutGapPx,
      DEFAULT_LAYOUT_MARGIN_PX,
      cardPaddingPx
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
          onGridSizeChange={setGridSizeOverride}
          onFontScaleChange={setFontScaleOverride}
          onCardSurfaceChange={setCardSurfaceOverride}
          quoteHyphenation={quoteHyphenation}
          layoutGapPx={layoutGapPx}
          layoutMarginPx={DEFAULT_LAYOUT_MARGIN_PX}
          cardPaddingPx={cardPaddingPx}
          mobileFallbackMode={mobileFallbackMode}
          swipeCardWidthPct={swipeCardWidthPct}
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
        globalCardTheme={globalCardTheme}
        setGlobalCardTheme={setGlobalCardTheme}
        selectedQuoteId={selectedQuoteId}
        onSelectQuote={setSelectedQuoteId}
        onEditQuote={onUpdateTestimonial ? (id) => setEditingQuoteId(id) : undefined}
        metadataOrder={metadataOrder}
        setMetadataOrder={setMetadataOrder}
        metadataToggles={metadataToggles}
        setMetadataToggle={setMetadataToggle}
        readabilityWarning={readabilityWarning}
        gridVacancyWarning={gridVacancyWarning}
        showGridLines={showGridLines}
        setShowGridLines={setShowGridLines}
        quoteHyphenation={quoteHyphenation}
        setQuoteHyphenation={setQuoteHyphenation}
        onExportSVG={handleExportSVG}
        onCopyEmbed={handleCopyEmbed}
        onDownloadHTML={handleDownloadHTML}
        layoutGapPx={layoutGapPx}
        setLayoutGapPx={setLayoutGapPx}
        cardPaddingPx={cardPaddingPx}
        setCardPaddingPx={setCardPaddingPx}
        mobileFallbackMode={mobileFallbackMode}
        setMobileFallbackMode={setMobileFallbackMode}
        swipeCardWidthPct={swipeCardWidthPct}
        setSwipeCardWidthPct={setSwipeCardWidthPct}
      />
    </div>
  );
}
