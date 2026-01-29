# Leva vs. Requirements: Evaluation Report for CTO

**Product:** MJI Testimonials Display Tool  
**Date:** January 2025  
**Purpose:** Assess whether Leva is the right control-panel solution and recommend alternatives if not.

---

## Executive summary

**Leva is a poor fit for this product.** It was built for creative/dev use cases (e.g. Three.js parameter tweaking), not for content editing, reordering, or relationship-aware controls. The current pain points—no drag/drop, clunky metadata ordering, no inline editing—are inherent to that design. **Recommendation:** replace the Leva panel with a **custom sidebar** that uses purpose-built UI: **@dnd-kit** for reordering (quotes + metadata fields) and **inline-editable components** on the quote cards. Effort is moderate (roughly 2–4 days); payoff is a UX that matches how non-technical users expect to work with content.

---

## 1. What we use the panel for today

| Need | Current implementation |
|------|------------------------|
| Layout mode | Leva dropdown (inline / grid) |
| Per-quote grid size | Leva dropdown per quote (Quote 1, Quote 2, …) |
| Show/hide metadata | Leva toggles (Year, Country, Age, etc.) |
| **Metadata display order** | Six number inputs (1–6) — no mutual exclusion |
| Warnings | Read-only text in Leva |
| Export | Leva buttons (SVG, embed, HTML) |
| **Reorder quotes** | Not implemented (was removed) |
| **Edit quote/meta text** | Not supported; data only from paste/CSV |

---

## 2. What Leva is designed for

- **Primary use case:** Real-time parameter panels for **creative coding** (e.g. Three.js, WebGL, animation). Think sliders, colors, toggles, and buttons that tweak scene/effect parameters.
- **Strengths:** Fast to add controls, good for devs tweaking numbers/options during development. Multiple panels, theming, and a clean API.
- **Not designed for:** Content editing, list/item reordering, relationship between controls (e.g. “exactly one of these must be 1, one must be 2…”), or inline editing on the canvas. It has no drag/drop primitives and no concept of “edit this text where it’s displayed.”

So we’re using a **parameter-tweaking** tool for **content and structure** tasks. That mismatch is the root of the UX issues.

---

## 3. Gap analysis

### 3.1 No drag/drop

- **Observation:** Reordering quotes or metadata fields by dragging is not possible with Leva; it only offers discrete controls (dropdowns, numbers, toggles).
- **Why:** Leva does not provide list/sortable components or drag-and-drop. Adding drag/drop would mean building it ourselves next to Leva, which doesn’t simplify the panel.
- **Conclusion:** Drag/drop requires a different UI layer (custom panel + a DnD library), not “more Leva.”

### 3.2 Metadata order UX is clunky and invalid

- **Observation:** Order is controlled by six number inputs (1–6). Users can set e.g. “all to 5”; there’s no visual or logical link between “order” and “which field is first/second,” and no enforcement of uniqueness.
- **Why:** Leva treats each control independently. It has no “sortable list” or “reorder these N items” primitive, and no built-in “permutation of 1..N” logic.
- **Conclusion:** A proper fix is a **single reorderable list** (e.g. “Year, Country, Age, State, Visa, Occupation” as one list you drag to reorder). That’s a custom component, not a Leva feature.

### 3.3 No inline editing of quote/meta text

- **Observation:** Users cannot click on a quote or metadata line in the preview and edit it there; all data comes from the initial paste/CSV.
- **Why:** Leva is a separate control panel; it doesn’t know about “the text inside that card.” Inline editing means making the **rendered quote/metadata elements** editable (e.g. `contentEditable` or click-to-edit components) and syncing back to app state. Leva doesn’t participate in that.
- **Conclusion:** Inline editing is a **canvas/card** feature, not a panel feature. We can add it regardless of Leva; keeping or removing Leva doesn’t block it, but a custom panel can be designed to work in concert with it (e.g. “Edit in place” as the primary flow).

---

## 4. Options and recommendations

### Option A — Keep Leva, patch UX where possible

- **What we’d do:** Keep layout toggles, export buttons, and maybe grid-size dropdowns in Leva. Replace **metadata order** with a small custom “Reorder metadata” block (e.g. a mini sortable list using @dnd-kit) embedded in the page (not in Leva). Add inline editing on cards separately.
- **Pros:** Minimal change to existing Leva usage.  
- **Cons:** Two paradigms (Leva panel + custom blocks), no quote reorder in Leva, and we still can’t do drag/drop *inside* Leva. UX stays fragmented.

**Verdict:** Only worth it as a short-term stopgap (e.g. “fix metadata order only”) if we’re not ready to replace the panel yet.

---

### Option B — Replace Leva with a custom sidebar (recommended)

- **What we’d do:**
  - Build a **custom sidebar** (React component) that contains:
    - Layout mode (dropdown or tabs).
    - **Quote list:** sortable list (e.g. @dnd-kit) so users drag to reorder quotes; optional per-quote grid size in the list row or a detail view.
    - **Metadata:** one sortable list “Reorder these fields” (Year, Country, Age, …) so order is always valid and obvious.
    - Same export actions (SVG, embed, HTML) as buttons.
    - Warnings (read-only) in the sidebar.
  - Add **inline editing** on the preview: click quote text or a metadata line to edit; persist into the same state the sidebar uses.
- **Libraries to use:**
  - **@dnd-kit** (sortable preset) for quote order and metadata field order. Mature, accessible, and built for this.
  - **Inline editing:** either a small `contentEditable` wrapper with blur/save, or a lightweight library (e.g. react-inline-edit, or a minimal custom component).
- **Pros:** One coherent “content + structure” UX; drag/drop and ordering are first-class; we can add inline edit as the main way to edit text. No dependency on a GUI built for creative-dev parameters.
- **Cons:** We own the sidebar UI and state wiring (estimated 2–4 days for a focused scope: sidebar + two sortable lists + export + optional inline edit v1).

**Verdict:** Best long-term fit for a non-technical, content-oriented tool.

---

### Option C — Heavyweight CMS / form framework

- **What it would be:** Use something like React Admin, or a form-builder that has list inputs, reorder, and inline-like editing out of the box.
- **Pros:** Feature-rich.  
- **Cons:** Overkill for a single-page testimonial tool; big dependency and mental model for a small team. Not recommended unless we’re building a broader content/admin platform.

---

## 5. Recommendation summary

| Priority | Recommendation |
|----------|----------------|
| **Primary** | **Replace Leva with a custom sidebar** that uses @dnd-kit for quote order and metadata field order, and add inline editing on the cards. |
| **Short term** | If we keep Leva for a sprint or two: replace the six number inputs with **one small sortable list** for “Metadata order” (custom component, @dnd-kit), and document that full drag/drop and inline edit are planned. |
| **Do not** | Rely on Leva for drag/drop, relationship-aware ordering, or inline editing; those are outside its design. |

---

## 6. References and links

- **Leva:** [pmndrs/leva](https://github.com/pmndrs/leva) — “React-first GUI for creative development”; panels for parameters, not content.
- **@dnd-kit (sortable):** [Sortable preset](https://docs.dndkit.com/presets/sortable) — list reorder with unique order, good for quotes and metadata order.
- **Inline editing:** [LogRocket – inline editable UI in React](https://blog.logrocket.com/build-inline-editable-ui-react/); minimal `contentEditable` + state is enough for our scope.

---

*Report prepared for CTO decision on control-panel strategy for MJI Testimonials Tool.*
