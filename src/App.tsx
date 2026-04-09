import { useState, useEffect, useCallback } from 'react';
import { parseTestimonials } from './lib/parser';
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
  getGridAspectRatioCss,
  CardThemeId,
  CardSurfaceOverride,
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
import './App.css';

function App() {
  const [input, setInput] = useState('');
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
  const [globalCardTheme, setGlobalCardTheme] = useState<CardThemeId>('light');
  const [cardSurfaceOverrides, setCardSurfaceOverrides] = useState<
    Record<string, CardSurfaceOverride>
  >({});
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);

  const editingTestimonial =
    editingQuoteId !== null ? testimonials.find((t) => t.id === editingQuoteId) ?? null : null;

  useEffect(() => {
    if (!pasteModalOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPasteModalOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [pasteModalOpen]);

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInput(text);
    
    if (text.trim()) {
      const result = parseTestimonials(text);
      setTestimonials(result.testimonials);
      setErrors(result.errors);
    } else {
      setTestimonials([]);
      setErrors([]);
    }
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
      const response = await fetch('/src/data/sample-testimonials.csv');
      const text = await response.text();
      setInput(text);
      const result = parseTestimonials(text);
      const selected = pickRandom(result.testimonials, 6);
      setTestimonials(selected);
      setErrors(result.errors);
    } catch (error) {
      console.error('Failed to load sample CSV:', error);
    }
  };

  const loadSampleTab = async () => {
    try {
      const response = await fetch('/src/data/sample-testimonials.txt');
      const text = await response.text();
      setInput(text);
      const result = parseTestimonials(text);
      setTestimonials(result.testimonials);
      setErrors(result.errors);
    } catch (error) {
      console.error('Failed to load sample tab-separated:', error);
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
        cardSurfaceOverrides
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
        <div className="renderer-section">
          <div
            className={
              layoutMode === 'grid' && gridAspectRatio !== 'fit'
                ? 'renderer-preview-wrapper renderer-preview-wrapper--scroll-pad'
                : 'renderer-preview-wrapper'
            }
            style={
              layoutMode === 'grid'
                ? gridAspectRatio === 'fit'
                  ? {
                      width: '100%',
                      maxWidth: 'min(100%, 1200px)',
                    }
                  : {
                      width: '100%',
                      maxWidth: 'min(100%, 1200px)',
                      aspectRatio: getGridAspectRatioCss(gridAspectRatio, gridAspectRatioFlipped),
                      overflow: 'auto',
                    }
                : undefined
            }
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
                    : { width: '100%', height: '100%' }
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
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state-section">
          <p className="empty-state">No testimonials yet. Use the buttons in the header to paste data or load a sample.</p>
          <button type="button" className="empty-state-add-quote" onClick={handleAddQuote}>
            Add quote
          </button>
        </div>
      )}
    </div>
  );

  const pasteModal = pasteModalOpen && (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paste-modal-title"
      onClick={() => setPasteModalOpen(false)}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="paste-modal-title" className="modal-title">Paste testimonial data</h2>
        <p className="modal-hint">Paste CSV or tab-separated data below. It will be parsed as you type.</p>
        <textarea
          className="input-textarea modal-textarea"
          value={input}
          onChange={handlePaste}
          placeholder="Paste CSV or tab-separated testimonial data here..."
          rows={12}
          autoFocus
        />
        {errors.length > 0 && (
          <div className="errors-section modal-errors">
            <h3>Parse Errors ({errors.length})</h3>
            <ul>
              {errors.map((error, idx) => (
                <li key={idx} className="error-item">{error}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="modal-btn-primary" onClick={() => setPasteModalOpen(false)}>
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1>MJI Testimonials Tool</h1>
          <p>Visualize and export worker testimonials</p>
        </div>
        <div className="app-header-actions">
          <button type="button" className="header-btn" onClick={() => setPasteModalOpen(true)}>
            Paste text
          </button>
          <button type="button" className="header-btn" onClick={loadSampleCSV}>
            Load Sample CSV
          </button>
          <button type="button" className="header-btn" onClick={loadSampleTab}>
            Load Sample Tab-Separated
          </button>
        </div>
      </header>

      {pasteModal}

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
            setGridSizeOverride={setGridSizeOverride}
            fontScaleOverrides={fontScaleOverrides}
            setFontScaleOverride={setFontScaleOverride}
            globalCardTheme={globalCardTheme}
            setGlobalCardTheme={setGlobalCardTheme}
            cardSurfaceOverrides={cardSurfaceOverrides}
            setCardSurfaceOverride={setCardSurfaceOverride}
            selectedQuoteId={selectedQuoteId}
            onSelectQuote={setSelectedQuoteId}
            onEditSelectedQuote={() => {
              if (selectedQuoteId) setEditingQuoteId(selectedQuoteId);
            }}
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
      ) : (
        mainContent
      )}
    </div>
  );
}

export default App;
