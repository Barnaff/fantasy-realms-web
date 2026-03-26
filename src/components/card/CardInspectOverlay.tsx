import { useRef, useLayoutEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardPreview } from './Card.tsx';
import type { ResolvedCard } from '../../types/card.ts';
import type { LongPressPosition } from '../../hooks/useLongPress.ts';

const PREVIEW_W = 260;
const MARGIN = 8;

/**
 * Inner component that measures itself then animates into position.
 * Keyed by card id so it remounts (and replays animation) for each new card.
 */
function InspectCard({
  card,
  position,
  onClose,
}: {
  card: ResolvedCard;
  position?: LongPressPosition | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    if (!position) {
      setPos({
        left: (window.innerWidth - PREVIEW_W) / 2,
        top: (window.innerHeight - ref.current.offsetHeight) / 2,
      });
      return;
    }

    const h = ref.current.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = position.pointerY - h;
    let left = position.x - PREVIEW_W / 2;

    left = Math.max(MARGIN, Math.min(left, vw - PREVIEW_W - MARGIN));
    if (top < MARGIN) top = position.pointerY;
    top = Math.max(MARGIN, Math.min(top, vh - h - MARGIN));

    setPos({ left, top });
  }, [position]);

  return (
    <motion.div
      className="fixed inset-0 z-50"
      onClick={onClose}
      onPointerUp={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Hidden measurement pass */}
      {!pos && (
        <div ref={ref} className="absolute" style={{ left: -9999, top: -9999, visibility: 'hidden' }}>
          <CardPreview card={card} />
        </div>
      )}

      {/* Visible animated card */}
      {pos && (
        <motion.div
          className="absolute z-10"
          data-inspect-preview={card.instanceId}
          style={{
            left: pos.left,
            top: pos.top,
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))',
          }}
          initial={{ opacity: 0, y: 60, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 320, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <CardPreview card={card} />
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Shows a large card preview floating above the press point.
 * AnimatePresence handles the exit animation when card becomes null.
 */
export function CardInspectOverlay({
  card,
  position,
  onClose,
}: {
  card: ResolvedCard | null;
  position?: LongPressPosition | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {card && (
        <InspectCard
          key={card.instanceId}
          card={card}
          position={position}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}
