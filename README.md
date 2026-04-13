# MJI Testimonials Tool

A production-ready testimonial visualization tool for Migrant Justice Institute (MJI). Displays 1-10 worker testimonials in two modes: stack (single-column cards) and bento grid layouts (for graphics/responsive web).

## Features

- **Dual Display Modes**
  - Stack: Single-column cards with metadata (report-friendly); same card editing as grid
  - Bento grid: Multi-quote layouts with dynamic cell sizing

- **Data Input**
  - CSV format with headers (primary)
  - Tab-separated format (legacy support)
  - Auto-detection of format on paste

- **Layout Controls (sidebar)**
  - Toggle between stack and grid modes
  - Sortable quote list: drag to reorder, per-quote grid size dropdown
  - Sortable metadata order: drag to reorder fields, show/hide toggles
  - Export: SVG, copy embed code, download HTML
  - Edit quotes via modal (double-click card or sidebar) and sidebar controls

- **Export Options**
  - SVG export (preserves text as editable text for InDesign)
  - Self-contained HTML embed code
  - Copy to clipboard functionality

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Usage

### Input Format

**CSV Format (Recommended):**
```csv
quote,year,country,age,state,visa,occupation
"Quote text here",2023,China,"22 years old",NSW,"Student Visa (500)","Hospitality worker"
```

**Tab-Separated Format:**
```
Quote text here. (2023	China	22 years old	NSW	Student Visa (500)	Hospitality worker)
```

### Controls

The **sidebar (right)** provides:
- **Layout**: Tabs for Stack or Grid mode
- **Quotes**: Drag to reorder; per-quote grid size dropdown (Auto, 1x1 … 4x2)
- **Metadata order**: Drag to reorder Year, Country, Age, State, Visa, Occupation; checkboxes to show/hide each field
- **Export**: Buttons to export SVG, copy embed code, or download HTML
- **Editing**: Double-click a card or use **Edit quote** in the sidebar to open the quote editor

### Modifying Styles

All visual styles are centralised in `src/lib/styleConfig.ts`. To change:
- Colours: Edit `styleConfig.colors`
- Typography: Edit `styleConfig.typography`
- Stack / embed quote styles: Edit `styleConfig.inline`
- Grid cell styles: Edit `styleConfig.grid`

Changes will apply globally across all components.

## Project Structure

```
src/
├── components/
│   ├── QuoteRenderer.tsx    # Main component: state + preview + Sidebar
│   ├── Sidebar.tsx          # Right sidebar: layout, quote list, metadata, export
│   ├── QuoteList.tsx        # Sortable quote list (drag + grid size)
│   ├── MetadataOrderList.tsx # Sortable metadata order + toggles
│   ├── EditableText.tsx     # Used where inline inputs are needed
│   ├── GridQuote.tsx        # Card surface (grid + stack layout)
│   └── ErrorBoundary.tsx    # Error handling
├── lib/
│   ├── parser.ts             # CSV/tab-separated parser
│   ├── gridLayout.ts         # Bin-packing algorithm
│   ├── styleConfig.ts        # Centralised styles
│   └── exportUtils.ts        # SVG/HTML export functions
├── types/
│   └── testimonial.ts        # TypeScript definitions
└── data/
    ├── sample-testimonials.csv
    └── sample-testimonials.txt
```

## Architecture

### Grid Layout Algorithm

The grid uses a bin-packing algorithm (`src/lib/gridLayout.ts`) that:
- Calculates cell sizes based on character count:
  - <100 chars: 1x1
  - 100-300 chars: 1x2 (wider for readability)
  - 300+ chars: 2x2
- Places cells optimally using first-fit decreasing algorithm
- Returns CSS Grid `grid-row` and `grid-column` values for explicit placement

### Parser

The parser (`src/lib/parser.ts`) auto-detects format:
- Checks for CSV header pattern
- Handles quoted CSV fields with escaped quotes
- Supports tab-separated format with parentheses-wrapped metadata
- Gracefully handles missing fields and edge cases

### Export

- **SVG Export**: Uses `dom-to-svg` library to preserve text as `<text>` elements (not paths) for InDesign compatibility
- **Embed Code**: Generates self-contained HTML with inline styles, no external dependencies

### Squarespace Integration Contract

Supported:
- Insert via Squarespace Code Block
- Placement contexts that do not force ancestor `overflow-x: hidden|clip`
- Current embed snippet output (scoped `mji-*` classes)

Behavior in hostile host wrappers:
- The embed detects ancestor `overflow-x: hidden|clip`
- Horizontal swipe content may be clipped by host wrappers outside the embed DOM

Not supported:
- Guaranteed horizontal swipe behavior inside arbitrary host wrappers that enforce clipping outside the embed DOM boundary

## Known Limitations

- Grid layout uses fixed 4-column layout on desktop (responsive breakpoints not yet implemented)
- SVG export may not preserve all CSS properties perfectly (test in InDesign)

## Adding Export Formats

To add a new export format:

1. Add function to `src/lib/exportUtils.ts`
2. Add button to `Sidebar.tsx` and handler in `QuoteRenderer.tsx`

## Development Notes

- All styles must come from `styleConfig.ts` - no hardcoded styles in components
- Grid algorithm handles edge cases (all short quotes, all long quotes, mixed)
- Parser is robust but may need updates for new data formats

## License

Internal tool for MJI.
