# Grid drag-and-drop: investigation

## Question

Is it possible to drag and drop cards into different slots in the grid and have others reflow around them?

## Current model

- **Order-based layout**: The grid has no explicit “slots.” Layout is computed by `calculateGridLayout()` from:
  1. The **order** of testimonials in the `testimonials` array.
  2. Per-quote **size overrides** (e.g. 2×2, 4×1).
- A **bin-packing** algorithm (first-fit, largest-first) assigns each quote to a (row, col) position. So “slot” is determined by array order and sizes, not by fixed grid cells.

## Options

### A. Keep order-based layout; interpret drag as reorder

- **Idea**: Dragging card A onto card B (or onto a drop zone between cards) updates the **testimonials order** (e.g. swap A and B, or move A to B’s index). `calculateGridLayout()` is run again, so all cards reflow.
- **Pros**: No new data model; reuses existing state and layout logic. “Others filter around” is natural: new order → new layout.
- **Cons**: User is not choosing a literal “slot” (row/col); they’re choosing “put this quote before/after this one” or “swap with this one.” So “drag into a slot” is really “reorder in the list,” with visual feedback in the grid.
- **Feasibility**: High. Same state as sidebar reorder; could use `@dnd-kit` (or similar) on grid cells with a different collision/overlay strategy and on drop call `onReorderQuotes(newOrder)` (e.g. swap or move by index).

### B. Explicit slot model

- **Idea**: Grid has fixed or dynamic “slots” (e.g. row/col + span). Each slot holds an optional `testimonialId`. Drag assigns a quote to a slot; others are reassigned to remaining slots (or re-run bin-pack for “unassigned” quotes).
- **Pros**: True “put this card here” semantics; could support empty slots.
- **Cons**: Larger change: new state shape (slot → id or id → slot), layout algorithm that respects explicit placements first, then fills gaps. Export and sidebar list order need clear rules (e.g. order by grid position).
- **Feasibility**: Medium. Doable but more work and edge cases (e.g. more quotes than slots, overlapping spans).

## Recommendation

- **Short term**: Treat grid DnD as **order-based** (Option A). On “drop card A on card B,” compute a new order (e.g. swap indices or move A to B’s index) and call existing `onReorderQuotes(newOrder)`. Layout recalculates and cards reflow. No new model; robust and consistent with current architecture.
- **Later**, if product needs true “slot” control or empty cells, design an explicit slot model (Option B) and migrate.

## Root takeaway

The “root problem” is: **placement is derived from order + sizes, not from stored positions.** So “drag to a different slot” can be implemented as **reorder + reflow** without hacks. A slot-based model would be a separate, larger feature.
