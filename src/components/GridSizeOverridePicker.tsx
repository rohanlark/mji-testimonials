import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  GridSizeOverride,
  parseGridSizeOverride,
  formatGridSizeOverrideLabel,
} from '../types/testimonial';

function cellToOverride(col: number, row: number): GridSizeOverride {
  return `${col + 1}x${row + 1}` as GridSizeOverride;
}

interface GridSizeOverridePickerProps {
  value: GridSizeOverride;
  validOptions: GridSizeOverride[];
  onChange: (size: GridSizeOverride) => void;
  /** When value is auto, show packed span in the trigger (e.g. "3×2"). */
  autoResolvedSpanLabel?: string;
  'aria-label'?: string;
}

export function GridSizeOverridePicker({
  value,
  validOptions,
  onChange,
  autoResolvedSpanLabel,
  'aria-label': ariaLabel = 'Quote cell size on grid',
}: GridSizeOverridePickerProps) {
  const [open, setOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [fixedPos, setFixedPos] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const popoverEl = popoverRef.current;
    const width = popoverEl?.offsetWidth ?? 220;
    let left = r.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    setFixedPos({ top: r.bottom + 6, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
      setHoveredCell(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setHoveredCell(null);
        btnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const selectedParsed = value === 'auto' ? null : parseGridSizeOverride(value);
  const selectedCol = selectedParsed ? selectedParsed.colSpan - 1 : -1;
  const selectedRow = selectedParsed ? selectedParsed.rowSpan - 1 : -1;

  const hoverOptionValid =
    hoveredCell !== null && validOptions.includes(cellToOverride(hoveredCell.col, hoveredCell.row));

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) {
      setOpen(false);
      setHoveredCell(null);
    } else {
      updatePosition();
      setOpen(true);
    }
  };

  const pick = (size: GridSizeOverride) => {
    onChange(size);
    setOpen(false);
    setHoveredCell(null);
    btnRef.current?.focus();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="quote-grid-size-trigger"
        onClick={handleToggle}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {value === 'auto' && autoResolvedSpanLabel
          ? `auto (${autoResolvedSpanLabel})`
          : formatGridSizeOverrideLabel(value)}
      </button>
      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="quote-grid-size-popover"
            style={{ position: 'fixed', top: fixedPos.top, left: fixedPos.left, zIndex: 4000 }}
            role="dialog"
            aria-label="Choose quote cell size"
          >
            <div className="quote-grid-size-popover-header">
              <span className="quote-grid-size-popover-title">Cell size</span>
              <span className="quote-grid-size-popover-hint">Span on the layout grid</span>
            </div>
            <button
              type="button"
              className={`quote-grid-size-auto ${value === 'auto' ? 'quote-grid-size-auto-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                pick('auto');
              }}
            >
              Auto
            </button>
            <div className="layout-grid-selector-grid quote-grid-size-mini-grid">
              {[0, 1, 2, 3].map((row) =>
                [0, 1, 2, 3].map((col) => {
                  const opt = cellToOverride(col, row);
                  const valid = validOptions.includes(opt);
                  const selected =
                    selectedParsed !== null && col === selectedCol && row === selectedRow;
                  const inSelectedRegion =
                    selectedParsed !== null &&
                    col <= selectedCol &&
                    row <= selectedRow &&
                    !selected;
                  const inHoverRegion =
                    hoverOptionValid &&
                    hoveredCell !== null &&
                    col <= hoveredCell.col &&
                    row <= hoveredCell.row &&
                    !(hoveredCell.col === col && hoveredCell.row === row);
                  const isHoverCell =
                    hoveredCell !== null && hoveredCell.col === col && hoveredCell.row === row;
                  return (
                    <button
                      key={`${col}-${row}`}
                      type="button"
                      disabled={!valid}
                      className={`layout-grid-cell ${selected ? 'layout-grid-cell-selected' : ''} ${inSelectedRegion ? 'layout-grid-cell-region' : ''} ${inHoverRegion ? 'layout-grid-cell-hover-region' : ''} ${isHoverCell ? 'layout-grid-cell-hover' : ''} ${!valid ? 'layout-grid-cell-invalid' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!valid) return;
                        pick(opt);
                      }}
                      onMouseEnter={() => valid && setHoveredCell({ col, row })}
                      onMouseLeave={() => setHoveredCell(null)}
                      aria-label={`${col + 1} by ${row + 1}`}
                      aria-pressed={selected}
                      title={valid ? `${col + 1}×${row + 1}` : 'Does not fit layout grid'}
                    />
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
