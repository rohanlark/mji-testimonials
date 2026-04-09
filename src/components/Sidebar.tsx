import { useState } from 'react';
import {
  LayoutMode,
  Testimonial,
  GridSizeOverride,
  QuoteFontScaleOverride,
  GridAspectRatio,
  GridDimensions,
  GRID_ASPECT_RATIO_OPTIONS,
  MetadataFieldKey,
  MetadataToggles,
  CardThemeId,
  CardSurfaceOverride,
  CARD_THEME_IDS,
  CARD_THEME_LABELS,
} from '../types/testimonial';
import { calculateGridLayout, sortPlacementsReadingOrder } from '../lib/gridLayout';
import { QuoteList } from './QuoteList';
import { MetadataOrderList } from './MetadataOrderList';

export interface SidebarProps {
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  gridAspectRatio: GridAspectRatio;
  setGridAspectRatio: (ratio: GridAspectRatio) => void;
  gridAspectRatioFlipped: boolean;
  setGridAspectRatioFlipped: (flipped: boolean) => void;
  gridDimensions: GridDimensions;
  setGridDimensions: (d: GridDimensions) => void;
  testimonials: Testimonial[];
  onReorderQuotes: (newOrder: Testimonial[]) => void;
  onShuffleQuotes: () => void;
  onAddQuote?: () => void;
  onRemoveQuote?: (id: string) => void;
  gridSizeOverrides: Record<string, GridSizeOverride>;
  setGridSizeOverride: (testimonialId: string, size: GridSizeOverride) => void;
  fontScaleOverrides: Record<string, QuoteFontScaleOverride>;
  setFontScaleOverride: (testimonialId: string, scale: QuoteFontScaleOverride) => void;
  globalCardTheme: CardThemeId;
  setGlobalCardTheme: (theme: CardThemeId) => void;
  cardSurfaceOverrides: Record<string, CardSurfaceOverride>;
  setCardSurfaceOverride: (testimonialId: string, surface: CardSurfaceOverride) => void;
  selectedQuoteId: string | null;
  onSelectQuote: (id: string | null) => void;
  /** Grid: open modal to edit the selected quote (keyboard / explicit control). */
  onEditSelectedQuote?: () => void;
  metadataOrder: MetadataFieldKey[];
  setMetadataOrder: (order: MetadataFieldKey[]) => void;
  metadataToggles: MetadataToggles;
  setMetadataToggle: (field: keyof MetadataToggles, value: boolean) => void;
  readabilityWarning: string;
  /** Extra layout hint when empty 1×1 cells remain after packing. */
  gridVacancyWarning?: string;
  showGridLines: boolean;
  setShowGridLines: (value: boolean) => void;
  onExportSVG: () => void;
  onCopyEmbed: () => void;
  onDownloadHTML: () => void;
}

export function Sidebar({
  layoutMode,
  setLayoutMode,
  gridAspectRatio,
  setGridAspectRatio,
  gridAspectRatioFlipped,
  setGridAspectRatioFlipped,
  gridDimensions,
  setGridDimensions,
  testimonials,
  onReorderQuotes,
  onShuffleQuotes,
  onAddQuote,
  onRemoveQuote,
  gridSizeOverrides,
  setGridSizeOverride,
  fontScaleOverrides,
  setFontScaleOverride,
  globalCardTheme,
  setGlobalCardTheme,
  cardSurfaceOverrides,
  setCardSurfaceOverride,
  selectedQuoteId,
  onSelectQuote,
  onEditSelectedQuote,
  metadataOrder,
  setMetadataOrder,
  metadataToggles,
  setMetadataToggle,
  readabilityWarning,
  gridVacancyWarning = '',
  showGridLines,
  setShowGridLines,
  onExportSVG,
  onCopyEmbed,
  onDownloadHTML,
}: SidebarProps) {
  const [hoveredGridCell, setHoveredGridCell] = useState<{ col: number; row: number } | null>(null);

  const gridPlacements =
    layoutMode === 'grid' && testimonials.length > 0
      ? calculateGridLayout(
          testimonials,
          gridDimensions.columns,
          gridSizeOverrides,
          gridDimensions.rows
        )
      : [];

  const quoteListTestimonials =
    layoutMode === 'grid' && gridPlacements.length > 0
      ? sortPlacementsReadingOrder(gridPlacements).map((p) => p.testimonial)
      : testimonials;

  const resolvedAutoSpanById: Record<string, string> = {};
  for (const p of gridPlacements) {
    resolvedAutoSpanById[p.testimonial.id] = `${p.colSpan}×${p.rowSpan}`;
  }

  return (
    <aside className="sidebar">
      <section className="sidebar-section">
        <h3 className="sidebar-heading">Layout</h3>
        <div className="layout-tabs">
          <button
            type="button"
            className={`layout-tab ${layoutMode === 'grid' ? 'layout-tab-active' : ''}`}
            onClick={() => setLayoutMode('grid')}
          >
            Grid
          </button>
          <button
            type="button"
            className={`layout-tab ${layoutMode === 'stack' ? 'layout-tab-active' : ''}`}
            onClick={() => setLayoutMode('stack')}
          >
            Stack
          </button>
        </div>
        {layoutMode === 'grid' && (
          <>
            <div className="layout-grid-selector" role="group" aria-label="Grid size">
              <div className="layout-grid-selector-header">
                <span className="layout-grid-selector-label">Grid</span>
                <span className="layout-grid-selector-size" aria-live="polite">
                  {gridDimensions.columns}×{gridDimensions.rows}
                </span>
              </div>
              <div className="layout-grid-selector-grid">
                {[0, 1, 2, 3].map((row) =>
                  [0, 1, 2, 3].map((col) => {
                    const cols = col + 1;
                    const rows = row + 1;
                    const selected =
                      gridDimensions.columns === cols && gridDimensions.rows === rows;
                    const selectedCol = gridDimensions.columns - 1;
                    const selectedRow = gridDimensions.rows - 1;
                    const inSelectedRegion = col <= selectedCol && row <= selectedRow && !selected;
                    const inHoverRegion =
                      hoveredGridCell !== null &&
                      col <= hoveredGridCell.col &&
                      row <= hoveredGridCell.row &&
                      !(hoveredGridCell.col === col && hoveredGridCell.row === row);
                    const isHoverCell =
                      hoveredGridCell !== null &&
                      hoveredGridCell.col === col &&
                      hoveredGridCell.row === row;
                    return (
                      <button
                        key={`${col}-${row}`}
                        type="button"
                        className={`layout-grid-cell ${selected ? 'layout-grid-cell-selected' : ''} ${inSelectedRegion ? 'layout-grid-cell-region' : ''} ${inHoverRegion ? 'layout-grid-cell-hover-region' : ''} ${isHoverCell ? 'layout-grid-cell-hover' : ''}`}
                        onClick={() => setGridDimensions({ columns: cols, rows })}
                        onMouseEnter={() => setHoveredGridCell({ col, row })}
                        onMouseLeave={() => setHoveredGridCell(null)}
                        aria-label={`${cols}×${rows} grid`}
                        aria-pressed={selected}
                        title={`${cols}×${rows}`}
                      />
                    );
                  })
                )}
              </div>
            </div>
            <div className="layout-aspect-row">
              <label htmlFor="grid-aspect-ratio" className="layout-aspect-label">
                Aspect ratio
              </label>
              <select
                id="grid-aspect-ratio"
                className="layout-aspect-select"
                value={gridAspectRatio}
                onChange={(e) => setGridAspectRatio(e.target.value as GridAspectRatio)}
                aria-label="Grid aspect ratio"
              >
                {GRID_ASPECT_RATIO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {gridAspectRatio !== 'fit' && gridAspectRatio !== '1:1' && (
                <button
                  type="button"
                  className="layout-flip-btn layout-flip-btn-icon"
                  onClick={() => setGridAspectRatioFlipped(!gridAspectRatioFlipped)}
                  aria-label="Flip aspect ratio"
                  title="Flip aspect ratio (e.g. 16∶9 → 9∶16)"
                >
                  ⇄
                </button>
              )}
            </div>
            <label className="layout-grid-lines-toggle">
              <input
                type="checkbox"
                checked={showGridLines}
                onChange={(e) => setShowGridLines(e.target.checked)}
              />
              Show grid lines
            </label>
          </>
        )}
      </section>

      <section className="sidebar-section">
        <h3 className="sidebar-heading">Card colour</h3>
        <p className="sidebar-muted sidebar-section-hint">
          Default for all cards. Override per quote in the list below.
        </p>
        <label htmlFor="global-card-theme" className="card-theme-label">
          <span className="card-theme-label-text">Theme</span>
          <select
            id="global-card-theme"
            className="card-theme-select"
            value={globalCardTheme}
            onChange={(e) => setGlobalCardTheme(e.target.value as CardThemeId)}
          >
            {CARD_THEME_IDS.map((id) => (
              <option key={id} value={id}>
                {CARD_THEME_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="sidebar-section">
        <div className="sidebar-section-heading-row">
          <h3 className="sidebar-heading">Quotes</h3>
          <div className="sidebar-quotes-actions">
            {(layoutMode === 'grid' || layoutMode === 'stack') && selectedQuoteId && onEditSelectedQuote ? (
              <button
                type="button"
                className="quote-list-edit-selected"
                onClick={onEditSelectedQuote}
                aria-label="Edit selected quote"
              >
                Edit quote
              </button>
            ) : null}
            {onAddQuote ? (
              <button
                type="button"
                className="quote-list-add"
                onClick={onAddQuote}
                aria-label="Add quote"
                title="Add quote"
              >
                +
              </button>
            ) : null}
            <button
              type="button"
              className="quote-list-shuffle"
              onClick={onShuffleQuotes}
              aria-label="Shuffle quote order"
            >
              Shuffle
            </button>
          </div>
        </div>
        <QuoteList
          layoutMode={layoutMode}
          testimonials={quoteListTestimonials}
          onReorder={onReorderQuotes}
          onSelectQuote={onSelectQuote}
          gridDimensions={gridDimensions}
          gridSizeOverrides={gridSizeOverrides}
          onGridSizeChange={setGridSizeOverride}
          fontScaleOverrides={fontScaleOverrides}
          onFontScaleChange={setFontScaleOverride}
          cardSurfaceOverrides={cardSurfaceOverrides}
          onCardSurfaceChange={setCardSurfaceOverride}
          selectedQuoteId={selectedQuoteId}
          onRemoveQuote={onRemoveQuote}
          resolvedAutoSpanById={
            layoutMode === 'grid' && Object.keys(resolvedAutoSpanById).length > 0
              ? resolvedAutoSpanById
              : undefined
          }
        />
      </section>

      <section className="sidebar-section">
        <h3 className="sidebar-heading">Metadata order</h3>
        <MetadataOrderList
          order={metadataOrder}
          onReorder={setMetadataOrder}
          toggles={metadataToggles}
          onToggle={setMetadataToggle}
        />
      </section>

      {readabilityWarning || gridVacancyWarning ? (
        <section className="sidebar-section sidebar-warning">
          {readabilityWarning ? (
            <p className="sidebar-warning-text">{readabilityWarning}</p>
          ) : null}
          {gridVacancyWarning ? (
            <p className="sidebar-warning-text">{gridVacancyWarning}</p>
          ) : null}
        </section>
      ) : null}

      <section className="sidebar-section">
        <h3 className="sidebar-heading">Export</h3>
        <div className="sidebar-export-buttons">
          <button type="button" className="sidebar-btn" onClick={onExportSVG}>
            Export SVG
          </button>
          <button type="button" className="sidebar-btn" onClick={onCopyEmbed}>
            Copy Embed Code
          </button>
          <button type="button" className="sidebar-btn" onClick={onDownloadHTML}>
            Download HTML
          </button>
        </div>
      </section>
    </aside>
  );
}
