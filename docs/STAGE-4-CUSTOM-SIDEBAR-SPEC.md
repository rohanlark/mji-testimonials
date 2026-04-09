# Stage 4: Custom Sidebar Spec (Leva Replacement)

**Branch:** `feature/custom-sidebar-replace-leva`  
**Status:** Ready to implement  
**Timeline:** 2–4 days

---

## Scope (v1)

### 1. Layout controls
- Dropdown or tabs: **Stack** | **Grid**

### 2. Quote list
- **Sortable** with @dnd-kit (reorder quotes)
- Row: quote preview (first 50 chars) + truncation indicator
- Per-quote **grid size** dropdown inline: Auto | 1x1 | 1x2 | 2x1 | 2x2 | 3x1 | 3x2 | 4x1 | 4x2
- Optional: collapse/expand full quote in sidebar

### 3. Metadata controls
- **Single sortable list**: Year, Country, Age, State, Visa, Occupation — drag to reorder (no number inputs)
- Show/hide toggles per field

### 4. Export
- Buttons: **Export SVG**, **Copy Embed Code**, **Download HTML** (same as current)

### 5. Warnings
- Read-only text, e.g. “Quote too long for 1x1”

### 6. Inline editing (basic)
- Click quote text on card → editable
- Click metadata field → editable
- Blur or Enter = save; Esc = cancel
- Visual indicator (border/highlight) when editing
- Minimal `contentEditable` or small library (<5KB)

---

## Deferred
- Quote drag/drop in *preview* (sidebar reorder only for v1)
- Bulk actions (delete multiple, duplicate)
- Undo/redo
- Advanced metadata (e.g. datepicker) — text input only

---

## Technical
- **@dnd-kit/sortable** for quote list and metadata list
- Sidebar: right, fixed width 280–320px, scrollable
- State: keep existing React state; no Zustand/Redux
- Styling: match current tool; minimal, functional
- Mobile: ignore for v1

---

## Migration
1. Remove all Leva imports/components
2. Port layout + export to custom sidebar
3. Add quote list with @dnd-kit + per-quote size
4. Add metadata list with @dnd-kit + show/hide toggles
5. Wire inline editing
6. Verify existing behaviour (export, grid layout, etc.)

Clean break — no parallel Leva + sidebar.

---

## Git: create branch locally

If the repo is already initialized:

```bash
git checkout -b feature/custom-sidebar-replace-leva
```

If you need to init and create the branch from current work:

```bash
git init
git add -A
git commit -m "Initial commit: MJI testimonials tool (Leva-based)"
git branch -m main
git checkout -b feature/custom-sidebar-replace-leva
```

Then implement Stage 4 on `feature/custom-sidebar-replace-leva`.
