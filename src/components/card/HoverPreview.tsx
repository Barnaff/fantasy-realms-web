import { useRef, useState, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardPreview } from './Card.tsx';
import type { ResolvedCard } from '../../types/card.ts';

export interface HoverInfo {
  card: ResolvedCard;
  rect: DOMRect;
}

const PREVIEW_W = 260;
const MARGIN = 8;

function HoverPreviewInner({ info }: { info: HoverInfo }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const h = ref.current.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { rect } = info;

    // Prefer positioning above the card, centered horizontally
    let left = rect.left + rect.width / 2 - PREVIEW_W / 2;
    let top = rect.top - h - MARGIN;

    // If not enough room above, place below
    if (top < MARGIN) {
      top = rect.bottom + MARGIN;
    }

    // If still overflows bottom, try left/right of card
    if (top + h > vh - MARGIN) {
      top = Math.max(MARGIN, rect.top + rect.height / 2 - h / 2);
      left = rect.right + MARGIN;
      if (left + PREVIEW_W > vw - MARGIN) {
        left = rect.left - PREVIEW_W - MARGIN;
      }
    }

    // Clamp to screen
    left = Math.max(MARGIN, Math.min(left, vw - PREVIEW_W - MARGIN));
    top = Math.max(MARGIN, Math.min(top, vh - h - MARGIN));

    setPos({ left, top });
  }, [info]);

  return (
    <motion.div
      className="fixed z-40 pointer-events-none hidden sm:block"
      initial={{ opacity: 0, y: 10, scale: 0.92 }}
      animate={{ opacity: pos ? 1 : 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.92 }}
      transition={{ duration: 0.12 }}
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.25))',
      }}
    >
      <div ref={ref}>
        <CardPreview card={info.card} />
      </div>
    </motion.div>
  );
}

/**
 * Desktop hover preview — shows a large CardPreview near the hovered card.
 * Hidden on mobile (sm: breakpoint). Wrap usage with onMouseEnter/Leave.
 */
export function HoverPreview({ info }: { info: HoverInfo | null }) {
  return (
    <AnimatePresence>
      {info && <HoverPreviewInner key={info.card.instanceId} info={info} />}
    </AnimatePresence>
  );
}
