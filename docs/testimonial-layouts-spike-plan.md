# Spike plan: testimonial card layouts (carousel deck + reveal deck)

**Source:** CTO engineering brief (9 April 2026), “New Testimonial Card Layouts.”  
**Branch:** `spike/testimonial-layouts` (work happens here; `main` already has prior grid/stack tooling).  
**Status:** Planning / spike — not production-ready expectations.

This document **adapts** the CTO brief to this repository. Where the brief assumes Storybook or generic “component toolkit” wiring, this repo is a **Vite + React 18** app with a **sidebar layout switcher** and **SVG/embed export** paths that are layout-aware.

---

## Repository reality (integration map)

| Area | Notes |
|------|--------|
| **Layout modes** | `LayoutMode` in `src/types/testimonial.ts` is currently `'grid' \| 'stack'`. Spike adds two *logical* layouts; production naming TBD (`carousel_deck` / `reveal_deck` or similar). |
| **Preview** | `TestimonialPreview` in `src/components/QuoteRenderer.tsx` branches on `layoutMode` (grid vs stack). New modes need parallel branches and shared **card markup** (reuse patterns from stack/grid so export and vis stay aligned). |
| **Switcher** | `src/components/Sidebar.tsx`: grid/stack tabs. Extend with two more tabs (or grouped control if space is tight). |
| **App state** | `src/App.tsx` holds `layoutMode`; grid-only options should stay disabled/hidden when mode is not grid. |
| **Export** | `src/lib/exportUtils.ts` implements SVG/embed generation with `layoutMode` checks (`stack` vs `grid`). New layouts need **explicit decisions**: support in export in phase 1, or document “preview-only until layout stabilises.” |
| **Dependencies** | `package.json`: React 18, `@dnd-kit/*`, no animation library today. Any spike dependency (e.g. `motion`) is additive and should be evaluated for bundle size and tree-shaking. |
| **Prototypes** | There is **no Storybook**. Prototypes ship as **live modes in the app** (same testimonial data path as grid/stack), optionally gated behind `import.meta.env.DEV` later if we want to hide from casual users. |

---

## Goals (unchanged from brief)

### Layout A — “Carousel deck”

- Stacked visual depth (scale, y-offset, opacity behind front card).
- **Infinite** loop; touch/drag to advance; optional autoplay with pause on hover/focus.
- Performance: for large N, only mount visible stack + small buffer (virtual window).

### Layout B — “Reveal deck”

- **Finite** stack (1–4 testimonials); cards **exit** (no recycle).
- After last card leaves, **reveal** a slot behind (stat, CTA, etc.) with animation.
- **Reset** restores stack and hides reveal; no autoplay, no infinite loop.

### Shared (both)

- Animate **transform + opacity** only on interactive frames; static shadows via CSS.
- **A11y:** keyboard prev/next, polite live region, appropriate `aria-roledescription` (carousel vs card stack), `prefers-reduced-motion`, no focus trap.
- **Mobile:** horizontal gestures must not break vertical page scroll (direction lock or passive handling).

---

## Technical options (spike validation)

| Option | Fit for A | Fit for B | Notes |
|--------|-----------|-----------|--------|
| **`motion` (`motion/react`)** | Strong (drag, springs, reorder) | Strong (`AnimatePresence`, exit → reveal) | Single dependency for both; aligns with CTO recommendation; verify bundle after tree-shake. **Use `motion`, not deprecated `framer-motion`.** |
| **Embla + custom transforms** | Possible (headless loop) | Weak (finite exit + reveal is custom anyway) | Light; stacking/gestures largely hand-rolled. |
| **Swiper `effects.cards`** | Possible | Awkward | Heavier; carousel mental model; historically `cards` + `loop` issues — verify current version if considered. |
| **Vanilla pointer + CSS** | Possible | Possible | No deps; high maintenance (momentum, Safari). Only if bundle is a hard blocker. |

**Working hypothesis for this repo:** prefer **`motion`** for the spike unless measurements show an unacceptable bundle hit — one library covers A and B and matches existing React patterns.

---

## Deliverables (adjusted)

1. **Layout A prototype** in-app, reusing real card content (same metadata/theme hooks as stack where practical). Test with ~3, ~10, ~30 items (virtual window for larger N).
2. **Layout B prototype** with 1–3 cards + placeholder reveal slot + reset. Test 1 / 2 / 3 card edge cases.
3. **Written recommendation:** chosen library (or vanilla), bundle note, a11y hooks, and complexity estimate for **production** (including export if required).
4. **A11y notes:** keyboard, VoiceOver + NVDA behaviour, reduced-motion fallback (e.g. list + prev/next for A; list + “Show key content” toggle for B).
5. **Mobile notes:** iOS Safari / Android Chrome — scroll vs drag.
6. **Rough LOE** per layout for production hardening after spike sign-off.

**Explicit scope note:** CTO brief references CodeSandbox / Motion examples as **visual references** only; implementations should follow current **`motion` APIs** and this app’s component boundaries, not copied outdated snippets (`react-use-gesture`, old Framer imports, etc.).

---

## Implementation phases (suggested)

1. **Dependency spike** — add `motion`, smallest possible demo component, measure `npm run build` chunk delta, confirm reduced-motion handling.
2. **Layout A** — new mode in `LayoutMode`, `QuoteRenderer` branch, sidebar tab; loop + stack visuals + keyboard + `aria-live`.
3. **Layout B** — second mode, reveal slot as React `children` or prop from a thin wrapper in `App` for spike; reset + `AnimatePresence` (or CSS fallback when reduced motion).
4. **Export** — decide stub vs implement; if stub, list gaps in exportUtils for follow-up ticket.
5. **Write-up** — fold field test notes into this doc or a short `docs/testimonial-layouts-spike-results.md` when the spike completes.

---

## Open questions (carry from brief + repo-specific)

- **Export:** Do carousel/reveal need SVG/embed in v1, or is raster/screenshot the interim answer?
- **Reveal content:** Production likely needs a CMS-driven slot; spike can use static JSX in `App` behind a prop.
- **Card chrome:** Grid has resize/theme affordances; deck modes may hide grid-only controls — confirm UX with design.
- **Psychology of B:** Does “cards fly away” feel like loss? Test with real copy.

---

## References (external)

- Embla card-stack sandbox (WIP reference): community CodeSandbox linked in CTO brief — use for *feel*, not as production base.
- Motion card stack: `examples.motion.dev` / Motion docs — prefer official `motion` package docs for API.

When live pages or sandboxes are not machine-readable, **paste source** for the specific interaction detail being matched.
