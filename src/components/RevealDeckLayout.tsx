import { useCallback, useEffect, useState, type ReactNode, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Testimonial,
  MetadataToggles,
  MetadataFieldKey,
  GlobalCardThemeId,
} from '../types/testimonial';
import { resolveCardThemeId } from '../lib/cardThemes';
import { GridQuote } from './GridQuote';
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion';

const MAX_CARDS = 4;
const SWIPE_PX = 56;

function depthStyle(depth: number) {
  const scale = 1 - depth * 0.048;
  const y = depth * 16;
  const opacity = 1 - depth * 0.09;
  const zIndex = 20 - depth;
  return { scale, y, opacity, zIndex };
}

export interface RevealDeckLayoutProps {
  testimonials: Testimonial[];
  metadataToggles: MetadataToggles;
  metadataOrder: MetadataFieldKey[];
  globalCardTheme: GlobalCardThemeId;
  selectedQuoteId?: string | null;
  onSelectQuote?: (id: string | null) => void;
  onUpdateTestimonial?: (id: string, partial: Partial<Testimonial>) => void;
  onRequestEditQuote?: (id: string) => void;
  quoteHyphenation?: boolean;
  revealContent: ReactNode;
}

export function RevealDeckLayout({
  testimonials,
  metadataToggles,
  metadataOrder,
  globalCardTheme,
  selectedQuoteId,
  onSelectQuote,
  onUpdateTestimonial,
  onRequestEditQuote,
  quoteHyphenation = false,
  revealContent,
}: RevealDeckLayoutProps) {
  const reducedMotion = usePrefersReducedMotion();
  const deckCardTheme = resolveCardThemeId(globalCardTheme, 'inherit');

  const sliceInitial = useCallback(
    () => testimonials.slice(0, Math.min(MAX_CARDS, testimonials.length)),
    [testimonials]
  );
  const [queue, setQueue] = useState<Testimonial[]>(() => sliceInitial());
  const [revealed, setRevealed] = useState(false);
  const pendingRevealRef = useRef(false);

  useEffect(() => {
    if (revealed) return;
    setQueue(sliceInitial());
  }, [testimonials, sliceInitial, revealed]);

  useEffect(() => {
    if (!onSelectQuote) return;
    const front = queue[0];
    const id = front?.id ?? null;
    if (id && id !== selectedQuoteId) onSelectQuote(id);
  }, [queue, onSelectQuote, selectedQuoteId]);

  useEffect(() => {
    if (revealed) onSelectQuote?.(null);
  }, [revealed, onSelectQuote]);

  const dismissFront = useCallback(() => {
    setQueue((q) => {
      if (q.length === 1) pendingRevealRef.current = true;
      return q.slice(1);
    });
  }, []);

  const reset = useCallback(() => {
    pendingRevealRef.current = false;
    setRevealed(false);
    setQueue(sliceInitial());
  }, [sliceInitial]);

  const handleExitComplete = useCallback(() => {
    if (pendingRevealRef.current) {
      pendingRevealRef.current = false;
      setRevealed(true);
    }
  }, []);

  const transition = reducedMotion ? { duration: 0.12 } : { type: 'spring' as const, stiffness: 380, damping: 32 };
  const exitX = reducedMotion ? 0 : -280;

  if (testimonials.length === 0) return null;

  return (
    <div
      className="deck-reveal"
      role="group"
      aria-roledescription="card stack"
      aria-label="Testimonials and reveal"
    >
      <div
        className="deck-reveal__underlay"
        aria-hidden={!revealed}
        style={{ pointerEvents: revealed ? 'auto' : 'none' }}
      >
        <AnimatePresence>
          {revealed ? (
            <motion.div
              key="reveal-panel"
              className="deck-reveal__panel"
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
              transition={transition}
            >
              {revealContent}
              <button type="button" className="deck-reveal__reset" onClick={reset}>
                View testimonials again
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {!revealed ? (
        <div className="deck-reveal__stack">
          <div className="deck-reveal__viewport">
            <AnimatePresence initial={false} onExitComplete={handleExitComplete}>
              {queue.map((t, i) => {
                const depth = i;
                const isFront = i === 0;
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
                    key={t.id}
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
                      exit={
                        isFront
                          ? {
                              x: exitX,
                              opacity: reducedMotion ? 1 : 0,
                              transition: { duration: reducedMotion ? 0 : 0.28 },
                            }
                          : undefined
                      }
                      transition={transition}
                      drag={isFront && !reducedMotion ? 'x' : false}
                      dragConstraints={{ left: -140, right: 140 }}
                      dragElastic={0.22}
                      onDragEnd={
                        isFront && !reducedMotion
                          ? (_, info) => {
                              if (info.offset.x < -SWIPE_PX || info.velocity.x < -420) dismissFront();
                            }
                          : undefined
                      }
                    >
                      {card}
                    </motion.div>
                  </div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="deck-reveal__reduced-controls">
            <button type="button" className="deck-carousel__nav" onClick={dismissFront} disabled={queue.length === 0}>
              {reducedMotion ? 'Dismiss top card' : 'Dismiss (or swipe)'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
