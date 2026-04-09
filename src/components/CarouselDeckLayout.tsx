import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Testimonial,
  MetadataToggles,
  MetadataFieldKey,
  QuoteFontScaleOverride,
  CardSurfaceOverride,
  GlobalCardThemeId,
} from '../types/testimonial';
import { resolveCardThemeId } from '../lib/cardThemes';
import { GridQuote, type GridQuoteAppearanceControl } from './GridQuote';
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
  fontScaleOverrides: Record<string, QuoteFontScaleOverride>;
  globalCardTheme: GlobalCardThemeId;
  cardSurfaceOverrides: Record<string, CardSurfaceOverride>;
  selectedQuoteId?: string | null;
  onSelectQuote?: (id: string | null) => void;
  onUpdateTestimonial?: (id: string, partial: Partial<Testimonial>) => void;
  onRequestEditQuote?: (id: string) => void;
  quoteHyphenation?: boolean;
  makeAppearanceControl: (testimonialId: string) => GridQuoteAppearanceControl | undefined;
  autoplay?: boolean;
}

export function CarouselDeckLayout({
  testimonials,
  metadataToggles,
  metadataOrder,
  fontScaleOverrides,
  globalCardTheme,
  cardSurfaceOverrides,
  selectedQuoteId,
  onSelectQuote,
  onUpdateTestimonial,
  onRequestEditQuote,
  quoteHyphenation = false,
  makeAppearanceControl,
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

  const goNext = useCallback(() => {
    if (n <= 1) return;
    setActiveIndex((i) => (i + 1) % n);
  }, [n]);

  const goPrev = useCallback(() => {
    if (n <= 1) return;
    setActiveIndex((i) => (i - 1 + n) % n);
  }, [n]);

  useEffect(() => {
    if (n === 0) return;
    setActiveIndex((i) => Math.min(i, n - 1));
  }, [n]);

  useEffect(() => {
    if (!selectedQuoteId || n === 0) return;
    const idx = testimonials.findIndex((t) => t.id === selectedQuoteId);
    if (idx !== -1) setActiveIndex(idx);
  }, [selectedQuoteId, testimonials, n]);

  useEffect(() => {
    if (!onSelectQuote || n === 0) return;
    const id = testimonials[activeIndex]?.id ?? null;
    if (id && id !== selectedQuoteId) onSelectQuote(id);
  }, [activeIndex, n, onSelectQuote, selectedQuoteId, testimonials]);

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
          const appearanceControl = makeAppearanceControl(t.id);

          const card = (
            <GridQuote
              testimonial={t}
              rowSpan={1}
              colSpan={1}
              metadataToggles={metadataToggles}
              metadataOrder={metadataOrder}
              onUpdateTestimonial={onUpdateTestimonial}
              onRequestEdit={onUpdateTestimonial ? onRequestEditQuote : undefined}
              fontScaleOverride={fontScaleOverrides[t.id]}
              cardTheme={resolveCardThemeId(globalCardTheme, cardSurfaceOverrides[t.id])}
              quoteHyphenation={quoteHyphenation}
              onSelect={
                onSelectQuote
                  ? () =>
                      onSelectQuote(selectedQuoteId === t.id && isFront ? null : t.id)
                  : undefined
              }
              isSelected={isFront && selectedQuoteId === t.id}
              appearanceControl={isFront ? appearanceControl : undefined}
            />
          );

          if (!isFront) {
            return (
              <motion.div
                key={`${t.id}-d${depth}`}
                className="deck-carousel__layer"
                initial={false}
                animate={{
                  scale: ds.scale,
                  y: ds.y,
                  opacity: ds.opacity,
                  zIndex: ds.zIndex,
                }}
                transition={transition}
                style={{
                  pointerEvents: 'none',
                }}
              >
                {card}
              </motion.div>
            );
          }

          return (
            <motion.div
              key={`front-${t.id}`}
              className="deck-carousel__layer deck-carousel__layer--front"
              initial={false}
              animate={{
                scale: ds.scale,
                y: ds.y,
                opacity: ds.opacity,
                zIndex: ds.zIndex,
                x: 0,
              }}
              transition={transition}
              drag={reducedMotion || n <= 1 ? false : 'x'}
              dragConstraints={{ left: -120, right: 120 }}
              dragElastic={0.25}
              onDragEnd={(_, info) => {
                if (reducedMotion || n <= 1) return;
                if (info.offset.x < -SWIPE_PX || info.velocity.x < -420) goNext();
                else if (info.offset.x > SWIPE_PX || info.velocity.x > 420) goPrev();
              }}
            >
              {card}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
