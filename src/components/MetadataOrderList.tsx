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
  MetadataFieldKey,
  MetadataToggles,
  METADATA_FIELD_LABELS,
  METADATA_FIELD_TO_TOGGLE,
} from '../types/testimonial';

interface SortableMetadataRowProps {
  id: MetadataFieldKey;
  toggles: MetadataToggles;
  onToggle: (field: keyof MetadataToggles, value: boolean) => void;
}

function SortableMetadataRow({ id, toggles, onToggle }: SortableMetadataRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const toggleKey = METADATA_FIELD_TO_TOGGLE[id];
  const label = METADATA_FIELD_LABELS[id];

  return (
    <li ref={setNodeRef} style={style} className="metadata-order-item">
      <span
        className="metadata-order-drag"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        ⋮⋮
      </span>
      <label className="metadata-order-label">
        <input
          type="checkbox"
          checked={toggles[toggleKey]}
          onChange={(e) => onToggle(toggleKey, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
        <span>{label}</span>
      </label>
    </li>
  );
}

interface MetadataOrderListProps {
  order: MetadataFieldKey[];
  onReorder: (order: MetadataFieldKey[]) => void;
  toggles: MetadataToggles;
  onToggle: (field: keyof MetadataToggles, value: boolean) => void;
}

export function MetadataOrderList({
  order,
  onReorder,
  toggles,
  onToggle,
}: MetadataOrderListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = order.indexOf(active.id as MetadataFieldKey);
    const newIndex = order.indexOf(over.id as MetadataFieldKey);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(order, oldIndex, newIndex);
    onReorder(newOrder);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className="metadata-order-list">
          {order.map((key) => (
            <SortableMetadataRow
              key={key}
              id={key}
              toggles={toggles}
              onToggle={onToggle}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
