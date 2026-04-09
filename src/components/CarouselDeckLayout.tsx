import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Testimonial,
  MetadataToggles,
  MetadataFieldKey,
  GlobalCardThemeId,
} from '../types/testimonial';
import { resolveCardThemeId } from '../lib/cardThemes';
import { GridQuote } from './GridQuote';
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';

const STACK_DEPTH = 4;
const SWIPE_PX = 56;
const AUTOPLAY_MS = 4500;

const springTransition = { type: 'spring' as const, stiffness: 420, damping: 38 };
const instantSlide = { duration: 0.015 };

function depthStyle(depth: number) {
  const scale = 1 - depth * 0.042;
  const y = depth * 14;
  const opacity = 1 - depth * 0.085;
  const zIndex = 10 - depth;
  return { scale, y, opacity, zIndex };
}

export interface CarouselDeckLayoutProps {
  testimonials: Testimonial[];
  metadataToggles: MetadataToggles;
  metadataOrder: MetadataFieldKey[];
  globalCardTheme: GlobalCardThemeId;
  selectedQuoteId?: string | null;
  onSelectQuote?: (id: string | null) => void;
  onUpdateTestimonial?: (id: string, partial: Partial<Testimonial>) => void;
  onRequestEditQuote?: (id: string) => void;
  quoteHyphenation?: boolean;
  autoplay?: boolean;
}

export function CarouselDeckLayout({
  testimonials,
  metadataToggles,
  metadataOrder,
  globalCardTheme,
  selectedQuoteId,
  onSelectQuote,
  onUpdateTestimonial,
  onRequestEditQuote,
  quoteHyphenation = false,
  autoplay = false,
}: CarouselDeckLayoutProps) {
  const n = testimonials.length;
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const [hoverInside, setHoverInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const autoplayPaused = hoverInside || focusInside;
  const rootRef = useRef<HTMLDivElement>(null);
  const [announce, setAnnounce] = useState('');

  const deckCardTheme = resolveCardThemeId(globalCardTheme, 'inherit');

  useEffect(() => {
    if (n === 0) return;
    setActiveIndex((i) => Math.min(i, n - 1));
  }, [n]);

  /**
   * Parent/list → carousel only (one direction). Do NOT add an effect that pushes
   * activeIndex → onSelectQuote here: on the same paint, activeIndex is still stale,
   * so that effect would call onSelectQuote(front) and overwrite the list selection,
   * causing a rapid A↔B loop.
   */
  useEffect(() => {
    if (!selectedQuoteId || n === 0) return;
    const idx = testimonials.findIndex((t) => t.id === selectedQuoteId);
    if (idx === -1) return;
    setActiveIndex((cur) => (cur === idx ? cur : idx));
  }, [selectedQuoteId, testimonials, n]);

  const goNext = useCallback(() => {
    if (n <= 1) return;
    let nextIdx = 0;
    setActiveIndex((prev) => {
      nextIdx = (prev + 1) % n;
      return nextIdx;
    });
    const id = testimonials[nextIdx]?.id;
    if (id) onSelectQuote?.(id);
  }, [n, onSelectQuote, testimonials]);

  const goPrev = useCallback(() => {
    if (n <= 1) return;
    let nextIdx = 0;
    setActiveIndex((prev) => {
      nextIdx = (prev - 1 + n) % n;
      return nextIdx;
    });
    const id = testimonials[nextIdx]?.id;
    if (id) onSelectQuote?.(id);
  }, [n, onSelectQuote, testimonials]);

  useEffect(() => {
    if (n === 0) return;
    setAnnounce(`Testimonial ${activeIndex + 1} of ${n}`);
  }, [activeIndex, n]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onMouseEnter = () => setHoverInside(true);
    const onMouseLeave = () => setHoverInside(false);
    const onFocusIn = () => setFocusInside(true);
    const onFocusOut = (e: FocusEvent) => {
      if (!el.contains(e.relatedTarget as Node)) setFocusInside(false);
    };
    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    return () => {
      el.removeEventListener('mouseenter', onMouseEnter);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  useEffect(() => {
    if (!autoplay || reducedMotion || n <= 1 || autoplayPaused) return;
    const t = window.setInterval(goNext, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [autoplay, reducedMotion, n, autoplayPaused, goNext]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goPrev();
    }
  };

  if (n === 0) return null;

  const visibleDepth = Math.min(STACK_DEPTH, n);
  const layers: { testimonial: Testimonial; depth: number }[] = [];
  for (let depth = visibleDepth - 1; depth >= 0; depth--) {
    layers.push({
      testimonial: testimonials[(activeIndex - depth + n * STACK_DEPTH) % n],
      depth,
    });
  }

  const transition = reducedMotion ? instantSlide : springTransition;

  return (
    <div
      ref={rootRef}
      className="deck-carousel"
      role="group"
      aria-roledescription="carousel"
      aria-label="Testimonials"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="deck-sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </div>

      <div className="deck-carousel__controls">
        <button type="button" className="deck-carousel__nav" onClick={goPrev} disabled={n <= 1}>
          Previous
        </button>
        <button type="button" className="deck-carousel__nav" onClick={goNext} disabled={n <= 1}>
          Next
        </button>
      </div>

      <div className="deck-carousel__viewport">
        {layers.map(({ testimonial: t, depth }) => {
          const isFront = depth === 0;
          const ds = depthStyle(depth);

          const card = (
            <GridQuote
              testimonial={t}
              rowSpan={1}
              colSpan={1}
              metadataToggles={metadataToggles}
              metadataOrder={metadataOrder}
              onUpdateTestimonial={onUpdateTestimonial}
              onRequestEdit={onUpdateTestimonial ? onRequestEditQuote : undefined}
              fontScaleOverride={undefined}
              cardTheme={deckCardTheme}
              quoteHyphenation={quoteHyphenation}
            />
          );

          return (
            <div
              key={isFront ? `front-${t.id}` : `${t.id}-d${depth}`}
              className={`deck-layer-slot ${isFront ? 'deck-layer-slot--interactive' : ''}`}
              style={{ zIndex: ds.zIndex }}
            >
              <motion.div
                className={`deck-layer-motion ${isFront ? 'deck-layer-motion--front' : ''}`}
                initial={false}
                animate={{
                  scale: ds.scale,
                  y: ds.y,
                  opacity: ds.opacity,
                  x: 0,
                }}
                transition={transition}
                drag={isFront && !reducedMotion && n > 1 ? 'x' : false}
                dragConstraints={{ left: -120, right: 120 }}
                dragElastic={0.25}
                onDragEnd={
                  isFront && !reducedMotion && n > 1
                    ? (_, info) => {
                        if (info.offset.x < -SWIPE_PX || info.velocity.x < -420) goNext();
                        else if (info.offset.x > SWIPE_PX || info.velocity.x > 420) goPrev();
                      }
                    : undefined
                }
              >
                {card}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
