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
import { Testimonial } from '../types/testimonial';

const PREVIEW_LENGTH = 50;

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max).trim() + '…';
}

interface SortableQuoteRowProps {
  testimonial: Testimonial;
  isSelected: boolean;
  onSelect: () => void;
  onRemoveQuote?: (id: string) => void;
  onEditQuote?: (id: string) => void;
}

function SortableQuoteRow({
  testimonial,
  isSelected,
  onSelect,
  onRemoveQuote,
  onEditQuote,
}: SortableQuoteRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: testimonial.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`quote-list-item ${isSelected ? 'quote-list-item-active' : ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('.quote-list-drag, .quote-list-remove')) return;
        if (e.detail >= 2) return;
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
      <span
        className={onEditQuote ? 'quote-list-preview quote-list-preview--editable' : 'quote-list-preview'}
        title={onEditQuote ? `${testimonial.quote}\n\nDouble-click to edit` : testimonial.quote}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onEditQuote?.(testimonial.id);
        }}
      >
        {truncate(testimonial.quote, PREVIEW_LENGTH)}
      </span>
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
  testimonials: Testimonial[];
  onReorder: (newOrder: Testimonial[]) => void;
  onSelectQuote: (id: string | null) => void;
  selectedQuoteId: string | null;
  onRemoveQuote?: (id: string) => void;
  onEditQuote?: (id: string) => void;
}

export function QuoteList({
  testimonials,
  onReorder,
  onSelectQuote,
  selectedQuoteId,
  onRemoveQuote,
  onEditQuote,
}: QuoteListProps) {
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
              isSelected={selectedQuoteId === t.id}
              onSelect={() =>
                onSelectQuote(selectedQuoteId === t.id ? null : t.id)
              }
              onRemoveQuote={onRemoveQuote}
              onEditQuote={onEditQuote}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
