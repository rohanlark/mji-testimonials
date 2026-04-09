import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  LayoutMode,
  Testimonial,
  GridSizeOverride,
  QuoteFontScaleOverride,
  GridDimensions,
  getValidGridSizeOptions,
  CardSurfaceOverride,
  CardThemeId,
  CARD_THEME_IDS,
  CARD_THEME_LABELS,
} from '../types/testimonial';
import { GridSizeOverridePicker } from './GridSizeOverridePicker';

const FONT_SCALE_OPTIONS: { value: QuoteFontScaleOverride; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 0.8, label: 'S' },
  { value: 0.9, label: 'SM' },
  { value: 1, label: 'M' },
  { value: 1.1, label: 'ML' },
  { value: 1.2, label: 'L' },
  { value: 1.4, label: 'XL' },
];

const PREVIEW_LENGTH = 50;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max).trim() + '…';
}

interface SortableQuoteRowProps {
  testimonial: Testimonial;
  showGridSizePicker: boolean;
  gridSize: GridSizeOverride;
  gridSizeOptions: GridSizeOverride[];
  onGridSizeChange: (testimonialId: string, size: GridSizeOverride) => void;
  /** When size is auto, packed span from layout (e.g. "3×2") for the button label. */
  autoResolvedSpanLabel?: string;
  fontScale: QuoteFontScaleOverride;
  onFontScaleChange: (testimonialId: string, scale: QuoteFontScaleOverride) => void;
  cardSurface: CardSurfaceOverride;
  onCardSurfaceChange: (testimonialId: string, surface: CardSurfaceOverride) => void;
  isSelected: boolean;
  onSelect: () => void;
  onRemoveQuote?: (id: string) => void;
}

function SortableQuoteRow({
  testimonial,
  showGridSizePicker,
  gridSize,
  gridSizeOptions,
  onGridSizeChange,
  autoResolvedSpanLabel,
  fontScale,
  onFontScaleChange,
  cardSurface,
  onCardSurfaceChange,
  isSelected,
  onSelect,
  onRemoveQuote,
}: SortableQuoteRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: testimonial.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : undefined,
  };

  const effectiveGridSize = gridSizeOptions.includes(gridSize) ? gridSize : 'auto';

  const handleFontScaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    const scale: QuoteFontScaleOverride = v === 'auto' ? 'auto' : Number(v) as QuoteFontScaleOverride;
    onFontScaleChange(testimonial.id, scale);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`quote-list-item ${isSelected ? 'quote-list-item-active' : ''}`}
      onClick={(e) => {
        if (
          (e.target as HTMLElement).closest(
            '.quote-list-drag, select, .quote-grid-size-trigger, .quote-list-remove, .quote-list-card-theme'
          )
        )
          return;
        onSelect();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span
        className="quote-list-drag"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        ⋮⋮
      </span>
      <span className="quote-list-preview" title={testimonial.quote}>
        {truncate(testimonial.quote, PREVIEW_LENGTH)}
      </span>
      {showGridSizePicker ? (
        <GridSizeOverridePicker
          value={effectiveGridSize}
          validOptions={gridSizeOptions}
          onChange={(size) => onGridSizeChange(testimonial.id, size)}
          aria-label="Quote cell size on grid"
          autoResolvedSpanLabel={effectiveGridSize === 'auto' ? autoResolvedSpanLabel : undefined}
        />
      ) : null}
      <select
        className="quote-list-size quote-list-text-size quote-list-card-theme"
        value={cardSurface === 'inherit' ? '' : cardSurface}
        onChange={(e) => {
          const v = e.target.value;
          onCardSurfaceChange(
            testimonial.id,
            v === '' ? 'inherit' : (v as CardThemeId)
          );
        }}
        aria-label="Quote card colour"
        title="Card colour (default follows sidebar theme)"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="">Default</option>
        {CARD_THEME_IDS.map((id) => (
          <option key={id} value={id}>
            {CARD_THEME_LABELS[id]}
          </option>
        ))}
      </select>
      <select
        className="quote-list-size quote-list-text-size"
        value={String(fontScale)}
        onChange={handleFontScaleChange}
        aria-label="Quote text size"
        onClick={(e) => e.stopPropagation()}
      >
        {FONT_SCALE_OPTIONS.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
      {onRemoveQuote ? (
        <button
          type="button"
          className="quote-list-remove"
          aria-label="Remove this quote"
          title="Remove quote"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveQuote(testimonial.id);
          }}
        >
          ×
        </button>
      ) : null}
    </li>
  );
}

interface QuoteListProps {
  layoutMode: LayoutMode;
  testimonials: Testimonial[];
  onReorder: (newOrder: Testimonial[]) => void;
  onSelectQuote: (id: string | null) => void;
  gridDimensions: GridDimensions;
  gridSizeOverrides: Record<string, GridSizeOverride>;
  onGridSizeChange: (testimonialId: string, size: GridSizeOverride) => void;
  fontScaleOverrides: Record<string, QuoteFontScaleOverride>;
  onFontScaleChange: (testimonialId: string, scale: QuoteFontScaleOverride) => void;
  cardSurfaceOverrides: Record<string, CardSurfaceOverride>;
  onCardSurfaceChange: (testimonialId: string, surface: CardSurfaceOverride) => void;
  selectedQuoteId: string | null;
  onRemoveQuote?: (id: string) => void;
  /** Packed dimensions for each id when override is auto (grid mode, reading order list). */
  resolvedAutoSpanById?: Record<string, string>;
}

export function QuoteList({
  layoutMode,
  testimonials,
  onReorder,
  onSelectQuote,
  gridDimensions,
  gridSizeOverrides,
  onGridSizeChange,
  fontScaleOverrides,
  onFontScaleChange,
  cardSurfaceOverrides,
  onCardSurfaceChange,
  selectedQuoteId,
  onRemoveQuote,
  resolvedAutoSpanById,
}: QuoteListProps) {
  const showGridSizePicker = layoutMode === 'grid';
  const gridSizeOptions = getValidGridSizeOptions(gridDimensions);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = testimonials.findIndex((t) => t.id === active.id);
    const newIndex = testimonials.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(testimonials, oldIndex, newIndex);
    onReorder(newOrder);
  };

  if (testimonials.length === 0) {
    return <p className="sidebar-muted">No quotes loaded.</p>;
  }

  const itemIds = testimonials.map((t) => t.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <ul className="quote-list">
            {testimonials.map((t) => (
              <SortableQuoteRow
                key={t.id}
                testimonial={t}
                showGridSizePicker={showGridSizePicker}
                gridSize={gridSizeOverrides[t.id] ?? 'auto'}
                gridSizeOptions={gridSizeOptions}
                onGridSizeChange={onGridSizeChange}
                autoResolvedSpanLabel={resolvedAutoSpanById?.[t.id]}
                fontScale={fontScaleOverrides[t.id] ?? 'auto'}
                onFontScaleChange={onFontScaleChange}
                cardSurface={cardSurfaceOverrides[t.id] ?? 'inherit'}
                onCardSurfaceChange={onCardSurfaceChange}
                isSelected={selectedQuoteId === t.id}
                onSelect={() =>
                  onSelectQuote(selectedQuoteId === t.id ? null : t.id)
                }
                onRemoveQuote={onRemoveQuote}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
  );
}
