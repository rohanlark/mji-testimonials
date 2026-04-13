import { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo } from 'react';
import { parseTestimonials } from './lib/parser';
import sampleTestimonialsCsv from './data/sample-testimonials.csv?raw';
import {
  Testimonial,
  LayoutMode,
  MetadataToggles,
  MetadataFieldKey,
  DEFAULT_METADATA_ORDER,
  DEFAULT_METADATA_TOGGLES,
  GridSizeOverride,
  QuoteFontScaleOverride,
  GridAspectRatio,
  GridDimensions,
  CardSurfaceOverride,
  GlobalCardThemeId,
  MobileFallbackMode,
} from './types/testimonial';
import { TestimonialPreview } from './components/QuoteRenderer';
import { Sidebar } from './components/Sidebar';
import { QuoteEditModal } from './components/QuoteEditModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  calculateGridLayout,
  sortPlacementsReadingOrder,
  countVacantUnitCells,
} from './lib/gridLayout';
import { normalizeQuoteForLayout } from './lib/quoteNormalize';
import { createEmptyTestimonial } from './lib/createTestimonial';
import { generateSVG, generateEmbedCode, downloadFile, copyToClipboard } from './lib/exportUtils';
import { downloadTestimonialsCsvTemplate } from './lib/testimonialsCsvTemplate';
import {
  DEFAULT_CARD_PADDING_PX,
  DEFAULT_LAYOUT_GAP_PX,
  DEFAULT_LAYOUT_MARGIN_PX,
} from './lib/layoutSpacing';
import './App.css';

function getAspectRatioNumber(ratio: Exclude<GridAspectRatio, 'fit'>, flipped: boolean): number {
  const base: Record<Exclude<GridAspectRatio, 'fit'>, [number, number]> = {
    '1:1': [1, 1],
    '4:5': [4, 5],
    '16:9': [16, 9],
    a4: [210, 297],
  };
  const [w, h] = base[ratio];
  if (ratio === '1:1') return 1;
  const rw = flipped ? h : w;
  const rh = flipped ? w : h;
  return rw / rh;
}

function App() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
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
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const [fixedFrameSize, setFixedFrameSize] = useState<{ width: number; height: number } | null>(
    null
  );

  const editingTestimonial =
    editingQuoteId !== null ? testimonials.find((t) => t.id === editingQuoteId) ?? null : null;

  useEffect(() => {
    if (!resetConfirmOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setResetConfirmOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [resetConfirmOpen]);

  const resetAppState = useCallback(() => {
    setTestimonials([]);
    setErrors([]);
    setLayoutMode('grid');
    setMetadataToggles(DEFAULT_METADATA_TOGGLES);
    setMetadataOrder([...DEFAULT_METADATA_ORDER]);
    setGridSizeOverrides({});
    setFontScaleOverrides({});
    setGridAspectRatio('fit');
    setGridAspectRatioFlipped(false);
    setGridDimensions({ columns: 3, rows: 3 });
    setShowGridLines(false);
    setQuoteHyphenation(false);
    setGlobalCardTheme('light');
    setCardSurfaceOverrides({});
    setSelectedQuoteId(null);
    setEditingQuoteId(null);
    setLayoutGapPx(DEFAULT_LAYOUT_GAP_PX);
    setCardPaddingPx(DEFAULT_CARD_PADDING_PX);
    setMobileFallbackMode('swipe');
    setSwipeCardWidthPct(78);
    setResetConfirmOpen(false);
  }, []);

  const handleTitleClick = () => {
    const hasWorkToLose = testimonials.length > 0 || errors.length > 0;
    if (hasWorkToLose) {
      setResetConfirmOpen(true);
    } else {
      resetAppState();
    }
  };

  /** Hidden deck layouts: migrate to grid so users are not stuck on broken modes. */
  useEffect(() => {
    if (layoutMode === 'carousel_deck' || layoutMode === 'reveal_deck') {
      setLayoutMode('grid');
    }
  }, [layoutMode]);

  const activeAspectRatio = useMemo(() => {
    if (layoutMode !== 'grid' || gridAspectRatio === 'fit') return null;
    return getAspectRatioNumber(gridAspectRatio, gridAspectRatioFlipped);
  }, [layoutMode, gridAspectRatio, gridAspectRatioFlipped]);

  useLayoutEffect(() => {
    if (activeAspectRatio === null) {
      setFixedFrameSize(null);
      return;
    }
    const el = previewWrapperRef.current;
    if (!el) return;

    const measure = () => {
      const availableWidth = el.clientWidth;
      const appMain = el.closest('.app-main') as HTMLElement | null;
      const containerHeight = appMain?.clientHeight ?? window.innerHeight;
      const availableHeight = Math.max(280, containerHeight - 48);
      const width = Math.max(
        0,
        Math.floor(Math.min(availableWidth, availableHeight * activeAspectRatio))
      );
      const height = width <= 0 ? 0 : Math.floor(width / activeAspectRatio);
      setFixedFrameSize((prev) =>
        prev && prev.width === width && prev.height === height ? prev : { width, height }
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const appMain = el.closest('.app-main');
    if (appMain) ro.observe(appMain);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [activeAspectRatio]);

  const applyImportText = useCallback((text: string) => {
    if (text.trim()) {
      const result = parseTestimonials(text);
      setTestimonials(result.testimonials);
      setErrors(result.errors);
    } else {
      setTestimonials([]);
      setErrors([]);
    }
  }, []);

  const handleImportFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        applyImportText(text);
      } catch {
        alert('Could not read that file. Try a .csv or .txt file.');
      }
    },
    [applyImportText]
  );

  const onImportFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void handleImportFile(file);
  };

  const pickRandom = <T,>(arr: T[], n: number): T[] => {
    if (arr.length <= n) return [...arr];
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  };

  const shuffleQuotes = useCallback(() => {
    setTestimonials((prev) => [...prev].sort(() => Math.random() - 0.5));
  }, []);

  const handleAddQuote = useCallback(() => {
    const t = createEmptyTestimonial();
    setTestimonials((prev) => [...prev, t]);
    setSelectedQuoteId(t.id);
    setEditingQuoteId(t.id);
  }, []);

  const handleRemoveQuote = useCallback((id: string) => {
    if (!window.confirm('Remove this quote from the layout?')) return;
    setTestimonials((prev) => prev.filter((x) => x.id !== id));
    setGridSizeOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setFontScaleOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setCardSurfaceOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedQuoteId((cur) => (cur === id ? null : cur));
    setEditingQuoteId((cur) => (cur === id ? null : cur));
  }, []);

  const loadSampleCSV = async () => {
    try {
      const result = parseTestimonials(sampleTestimonialsCsv);
      const selected = pickRandom(result.testimonials, 6);
      setTestimonials(selected);
      setErrors(result.errors);
    } catch (error) {
      console.error('Failed to load sample CSV:', error);
    }
  };

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

  const placements = testimonials.length > 0 && layoutMode === 'grid'
    ? calculateGridLayout(testimonials, gridDimensions.columns, gridSizeOverrides, gridDimensions.rows)
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
    try {
      const svgString = await generateSVG(
        testimonials,
        layoutMode,
        gridSizeOverrides,
        metadataToggles,
        metadataOrder,
        gridDimensions,
        fontScaleOverrides,
        globalCardTheme,
        cardSurfaceOverrides,
        {
          layoutGapPx,
          layoutMarginPx: DEFAULT_LAYOUT_MARGIN_PX,
          cardPaddingPx,
        }
      );
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

  const mainContent = (
    <div className="app-content">
      {errors.length > 0 && (
        <div className="errors-section">
          <h3>Parse Errors ({errors.length})</h3>
          <ul>
            {errors.map((error, idx) => (
              <li key={idx} className="error-item">{error}</li>
            ))}
          </ul>
        </div>
      )}

      {testimonials.length > 0 ? (
        <div
          ref={previewWrapperRef}
          className="renderer-preview-wrapper"
          style={{ width: '100%', maxWidth: 'min(100%, 1200px)' }}
        >
            <div
              className={
                layoutMode === 'grid'
                  ? gridAspectRatio === 'fit'
                    ? 'renderer-preview-inner renderer-preview-inner-natural'
                    : 'renderer-preview-inner renderer-preview-inner-fill'
                  : undefined
              }
              style={
                layoutMode === 'grid'
                  ? gridAspectRatio === 'fit'
                    ? { width: '100%' }
                    : {
                        width: fixedFrameSize ? `${fixedFrameSize.width}px` : '100%',
                        height: fixedFrameSize ? `${fixedFrameSize.height}px` : undefined,
                        aspectRatio: fixedFrameSize ? undefined : activeAspectRatio ?? undefined,
                        overflow: 'hidden',
                      }
                  : undefined
              }
            >
              <div
                className={`renderer-preview ${
                  layoutMode === 'grid' && gridAspectRatio !== 'fit' ? 'renderer-preview-fill' : ''
                }`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('.grid-quote')) return;
                  setSelectedQuoteId(null);
                }}
              >
                <ErrorBoundary>
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
                    onUpdateTestimonial={(id, partial) =>
                      setTestimonials((prev) =>
                        prev.map((t) => (t.id === id ? { ...t, ...partial } : t))
                      )
                    }
                    onRequestEditQuote={(id) => setEditingQuoteId(id)}
                    showGridLines={showGridLines}
                    onGridSizeChange={setGridSizeOverride}
                    onFontScaleChange={setFontScaleOverride}
                    onCardSurfaceChange={setCardSurfaceOverride}
                    quoteHyphenation={quoteHyphenation}
                    layoutGapPx={layoutGapPx}
                    layoutMarginPx={DEFAULT_LAYOUT_MARGIN_PX}
                    cardPaddingPx={cardPaddingPx}
                    fitGridToFrame={activeAspectRatio !== null}
                    mobileFallbackMode={mobileFallbackMode}
                    swipeCardWidthPct={swipeCardWidthPct}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
      ) : (
        <div className="empty-state-section">
          <p className="empty-state-lead">No testimonials yet</p>
          <div
            className="empty-state-drop"
            role="region"
            aria-label="Drop a file to import"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void handleImportFile(file);
            }}
          >
            <span className="empty-state-drop-title">Upload CSV file</span>
            <span className="empty-state-drop-hint">Drag and drop, or click to choose</span>
          </div>
          <button
            type="button"
            className="empty-state-template-link"
            onClick={() => downloadTestimonialsCsvTemplate()}
          >
            Download CSV template
          </button>
          <button type="button" className="empty-state-add-quote" onClick={handleAddQuote}>
            Add a single quote
          </button>
        </div>
      )}
    </div>
  );

  const resetConfirmModal = resetConfirmOpen && (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-confirm-title"
      aria-describedby="reset-confirm-desc"
      onClick={() => setResetConfirmOpen(false)}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="reset-confirm-title" className="modal-title">
          Start over?
        </h2>
        <p id="reset-confirm-desc" className="modal-hint">
          Any testimonials, pasted data, and layout settings will be cleared. This can’t be undone.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="modal-btn-secondary"
            onClick={() => setResetConfirmOpen(false)}
          >
            Cancel
          </button>
          <button type="button" className="modal-btn-primary" onClick={resetAppState}>
            Clear and start over
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <button
            type="button"
            className="app-header-title-btn"
            onClick={handleTitleClick}
            aria-label="MJI Testimonials Tool — return to landing page"
          >
            MJI Testimonials Tool
          </button>
          <p>Visualise and export worker testimonials</p>
        </div>
        <div className="app-header-actions">
          <input
            ref={fileInputRef}
            type="file"
            className="app-import-file-input"
            accept=".csv,.txt,text/csv,text/plain"
            aria-label="Upload CSV or tab-separated text file"
            onChange={onImportFileInputChange}
          />
          <button type="button" className="header-btn header-btn--secondary" onClick={loadSampleCSV}>
            Load sample CSV
          </button>
          <button type="button" className="header-btn" onClick={() => fileInputRef.current?.click()}>
            Upload file
          </button>
        </div>
      </header>

      {resetConfirmModal}

      <QuoteEditModal
        testimonial={editingTestimonial}
        open={editingQuoteId !== null}
        onClose={() => setEditingQuoteId(null)}
        onSave={(id, partial) =>
          setTestimonials((prev) => prev.map((t) => (t.id === id ? { ...t, ...partial } : t)))
        }
      />

      {testimonials.length > 0 ? (
        <div className="app-body">
          <main className="app-main">
            {mainContent}
          </main>
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
            onReorderQuotes={(newOrder) => setTestimonials(newOrder)}
            onShuffleQuotes={shuffleQuotes}
            onAddQuote={handleAddQuote}
            onRemoveQuote={handleRemoveQuote}
            gridSizeOverrides={gridSizeOverrides}
            globalCardTheme={globalCardTheme}
            setGlobalCardTheme={setGlobalCardTheme}
            selectedQuoteId={selectedQuoteId}
            onSelectQuote={setSelectedQuoteId}
            onEditQuote={(id) => setEditingQuoteId(id)}
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
      ) : (
        mainContent
      )}
    </div>
  );
}

export default App;
