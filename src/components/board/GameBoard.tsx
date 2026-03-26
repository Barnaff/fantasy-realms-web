import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  motion,
  AnimatePresence,
  useAnimation,
  type PanInfo,
} from 'framer-motion';
import { useGameStore } from '../../hooks/useGameStore.ts';
import { resolveCard } from '../../engine/scoring.ts';
import { Card, CardPreview } from '../card/Card.tsx';
import { CardInspectOverlay } from '../card/CardInspectOverlay.tsx';
import { CardRelationArrows } from './CardRelationArrows.tsx';
import { ScorePanel } from '../encounter/ScorePanel.tsx';
import { MAX_RIVER_DISCARDS } from '../../types/game.ts';
import { useInspectGesture } from '../../hooks/useInspectGesture.ts';
import type { CardInstance } from '../../types/card.ts';
import type { ResolvedCard } from '../../types/card.ts';
import { formatCardText } from '../card/CardText.tsx';

/* ═══════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════ */

function vibrate(ms = 15) {
  try { navigator.vibrate?.(ms); } catch { /* noop */ }
}

function fanTransform(index: number, total: number) {
  if (total <= 1) return { rotate: 0, lift: 0 };
  const mid = (total - 1) / 2;
  const t = (index - mid) / mid;
  const maxAngle = Math.min(3.5 * total, 24);
  return { rotate: t * maxAngle, lift: t * t * 6 };
}

/* ═══════════════════════════════════════════════════════════
   Sparkle burst
   ═══════════════════════════════════════════════════════════ */

function Sparkles({ x, y, color = '#d4a437' }: { x: number; y: number; color?: string }) {
  const particles = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = 30 + Math.random() * 40;
      return { id: i, dx: Math.cos(angle) * dist, dy: Math.sin(angle) * dist, size: 3 + Math.random() * 4, delay: Math.random() * 0.08 };
    }), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{ left: x, top: y, width: p.size, height: p.size, background: color, boxShadow: `0 0 6px 2px ${color}` }}
          initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          animate={{ opacity: 0, x: p.dx, y: p.dy, scale: 0 }}
          transition={{ duration: 0.55, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Drawn-card reveal overlay
   ═══════════════════════════════════════════════════════════ */

function DrawnCardOverlay({ card, onDone }: { card: ResolvedCard; onDone: () => void }) {
  useEffect(() => { vibrate(30); const t = setTimeout(onDone, 850); return () => clearTimeout(t); }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
      animate={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
      exit={{ backgroundColor: 'rgba(0,0,0,0)' }}
      transition={{ duration: 0.15 }}
      onClick={onDone}
    >
      <motion.div
        className="absolute rounded-full"
        style={{ width: 320, height: 320, background: 'radial-gradient(circle, rgba(212,164,55,0.25) 0%, transparent 70%)' }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1.4, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      <motion.div
        initial={{ scale: 0.15, opacity: 0, rotateY: 90 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        exit={{ scale: 0.4, opacity: 0, y: 200 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        style={{ perspective: 600 }}
      >
        <CardPreview card={card} />
      </motion.div>
    </motion.div>
  );
}


/* ═══════════════════════════════════════════════════════════
   Hover preview (desktop)
   ═══════════════════════════════════════════════════════════ */

function HoverPreview({ card }: { card: ResolvedCard }) {
  return (
    <motion.div
      className="fixed z-40 pointer-events-none hidden sm:block"
      style={{ top: '50%', right: 16, y: '-50%' }}
      initial={{ opacity: 0, x: 30, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 30, scale: 0.9 }}
      transition={{ duration: 0.12 }}
    >
      <CardPreview card={card} />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Animated turn counter
   ═══════════════════════════════════════════════════════════ */

function TurnCounter({ turnsLeft, total }: { turnsLeft: number; total: number }) {
  const pct = turnsLeft / total;
  const color = pct > 0.5 ? '#4a7c59' : pct > 0.2 ? '#c9a227' : '#c4433a';
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-ink-muted text-[10px] sm:text-xs">Turns</span>
      <div className="relative w-14 sm:w-16 h-1.5 sm:h-2 rounded-full bg-parchment-300 overflow-hidden">
        <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ backgroundColor: color }} animate={{ width: `${pct * 100}%` }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} />
      </div>
      <motion.span key={turnsLeft} className="font-display text-xs sm:text-sm font-bold" style={{ color }} initial={{ scale: 1.4, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }}>
        {turnsLeft}
      </motion.span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Deck pile
   ═══════════════════════════════════════════════════════════ */

function DeckPile({ count, onClick, canDraw }: { count: number; onClick: () => void; canDraw: boolean }) {
  return (
    <motion.button
      onClick={canDraw ? onClick : undefined}
      disabled={!canDraw}
      className={clsx(
        'relative w-[56px] h-[78px] sm:w-[64px] sm:h-[90px] rounded-lg flex-shrink-0',
        'border-2 border-parchment-600 bg-parchment-700 shadow-lg',
        'flex flex-col items-center justify-center gap-0.5',
        canDraw && 'cursor-pointer active:scale-95 hover:shadow-xl hover:border-gold',
        !canDraw && 'opacity-40',
      )}
      whileHover={canDraw ? { scale: 1.05, y: -2 } : undefined}
      whileTap={canDraw ? { scale: 0.95 } : undefined}
    >
      <div className="w-[40px] h-[50px] sm:w-[46px] sm:h-[60px] rounded border border-parchment-500/40 bg-parchment-800/50 flex items-center justify-center">
        <span className="font-display text-parchment-400 text-base sm:text-lg">FR</span>
      </div>
      <span className="text-parchment-300 text-[7px] sm:text-[8px] font-bold">{count}</span>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════
   River card (draggable, with inspect button)
   ═══════════════════════════════════════════════════════════ */

function RiverCard({
  card, index, isDrawPhase, constraintsRef,
  onDraw, onHover,
}: {
  card: CardInstance; index: number; isDrawPhase: boolean;
  constraintsRef: React.RefObject<HTMLDivElement | null>;
  onDraw: (i: number) => void;
  onHover: (c: ResolvedCard | null) => void;
}) {
  const resolved = resolveCard(card);
  const isDragging = useRef(false);
  const dragStartTime = useRef(0);
  const controls = useAnimation();

  useEffect(() => {
    controls.start({ opacity: 1, scale: 1, x: 0, y: 0, transition: { type: 'spring', stiffness: 400, damping: 25, delay: index * 0.02 } });
  }, [controls, index]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    isDragging.current = false;
    if (isDrawPhase && info.offset.y > 50) {
      vibrate(20);
      onDraw(index);
    } else {
      // Spring back to grid position
      controls.start({ x: 0, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={controls}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className="relative touch-none"
      drag={isDrawPhase}
      dragConstraints={constraintsRef}
      dragElastic={0.15}
      onDragStart={() => { isDragging.current = true; dragStartTime.current = Date.now(); vibrate(8); }}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => isDrawPhase && onHover(resolved)}
      onMouseLeave={() => onHover(null)}
    >
      <Card
        card={resolved}
        scale={0.72}
        dimmed={!isDrawPhase}
        glowing={isDrawPhase}
        onClick={() => {
          if (Date.now() - dragStartTime.current < 150 || !isDragging.current) {
            if (isDrawPhase) onDraw(index);
          }
        }}
      />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Hand card (draggable, with inspect button)
   ═══════════════════════════════════════════════════════════ */

function HandCard({
  card, index, total, isSelected, isBlanked, isDiscardPhase,
  constraintsRef, onSelect, onDiscard, onHover,
}: {
  card: CardInstance; index: number; total: number;
  isSelected: boolean; isBlanked: boolean; isDiscardPhase: boolean;
  constraintsRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (i: number) => void;
  onDiscard: (i: number) => void;
  onHover: (c: ResolvedCard | null) => void;
}) {
  const resolved = resolveCard(card);
  const { rotate, lift } = fanTransform(index, total);

  const cardW = 100; // canonical card width
  const overlap = Math.min(cardW * 0.72, (window.innerWidth - 32) / Math.max(total, 1));
  const mid = (total - 1) / 2;
  const fanX = (index - mid) * overlap;

  const isDragging = useRef(false);
  const dragStartTime = useRef(0);
  const controls = useAnimation();

  // Target fan position
  const targetX = fanX;
  const targetY = isSelected ? -(lift + 28) : lift;
  const targetRotate = isSelected ? 0 : rotate;
  const targetScale = isSelected ? 1.18 : 1;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    isDragging.current = false;
    if (isDiscardPhase && info.offset.y < -60) {
      vibrate(20);
      onDiscard(index);
    } else {
      // Animate back to correct fan position
      controls.start({
        x: targetX,
        y: targetY,
        rotate: targetRotate,
        scale: targetScale,
        opacity: 1,
        transition: { type: 'spring', stiffness: 320, damping: 22 },
      });
    }
  };

  // Sync animate target whenever props change
  useEffect(() => {
    controls.start({
      x: targetX,
      y: targetY,
      rotate: targetRotate,
      scale: targetScale,
      opacity: 1,
      transition: { type: 'spring', stiffness: 320, damping: 22 },
    });
  }, [targetX, targetY, targetRotate, targetScale, controls]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.4, y: 60 }}
      animate={controls}
      exit={{ opacity: 0, scale: 0.3, y: -60, transition: { duration: 0.25 } }}
      className="absolute origin-bottom touch-none"
      style={{ zIndex: isSelected ? 30 : index + 1 }}
      drag={isDiscardPhase}
      dragConstraints={constraintsRef}
      dragElastic={0.2}
      onDragStart={() => { isDragging.current = true; dragStartTime.current = Date.now(); vibrate(8); }}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => onHover(resolved)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Discard glow */}
      <AnimatePresence>
        {isSelected && isDiscardPhase && (
          <motion.div className="absolute -inset-1 rounded-xl bg-tag-fire/20 -z-10" initial={{ opacity: 0 }} animate={{ opacity: [0.3, 0.6, 0.3] }} exit={{ opacity: 0 }} transition={{ repeat: Infinity, duration: 1.5 }} />
        )}
      </AnimatePresence>

      <Card
        card={resolved}
        selected={isSelected}
        blanked={isBlanked}
        onClick={() => {
          if (Date.now() - dragStartTime.current < 150 || !isDragging.current) onSelect(index);
        }}
      />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN GAMEBOARD
   Layout: header → river (grid, scrollable) → spacer → hand (pinned bottom)
   ═══════════════════════════════════════════════════════════ */

export function GameBoard() {
  const state = useGameStore(s => s.state);
  const drawFromDeckAction = useGameStore(s => s.drawFromDeckAction);
  const drawCard = useGameStore(s => s.drawCard);
  const discardCard = useGameStore(s => s.discardCard);
  const finalizeHand = useGameStore(s => s.finalizeHand);
  const getLiveScore = useGameStore(s => s.getLiveScore);

  const [hoverCard, setHoverCard] = useState<ResolvedCard | null>(null);
  const [drawnCard, setDrawnCard] = useState<ResolvedCard | null>(null);
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
  const [sparkle, setSparkle] = useState<{ x: number; y: number; color: string } | null>(null);

  // Build resolver for all visible cards
  const allCards = useMemo(() => {
    const m = new Map<string, ResolvedCard>();
    for (const c of state.hand.cards) { const r = resolveCard(c); m.set(r.instanceId, r); }
    if (state.river) { for (const c of state.river.cards) { const r = resolveCard(c); m.set(r.instanceId, r); } }
    return m;
  }, [state.hand.cards, state.river]);

  const { inspectCard: inspectResolved, inspectPos, dismiss: dismissInspect, containerHandlers: inspectHandlers } = useInspectGesture(
    useCallback((id: string) => allCards.get(id) ?? null, [allCards]),
  );

  // Refs for drag constraints — cards stay inside the whole board area
  const boardRef = useRef<HTMLDivElement>(null);

  const isDrawPhase = state.turnPhase === 'draw';
  const isDiscardPhase = state.turnPhase === 'discard';
  const turnsLeft = MAX_RIVER_DISCARDS - state.riverDiscardCount;
  const liveScore = getLiveScore();

  // Compute which cards in hand are blanked (for visual feedback)
  const blankedDefIds = useMemo(() => {
    const s = new Set<string>();
    if (liveScore) {
      for (const entry of liveScore.breakdown) {
        if (entry.blanked) s.add(entry.cardId);
      }
    }
    return s;
  }, [liveScore]);

  // Resolved hand for arrow relations
  const resolvedHand = useMemo(() => state.hand.cards.map(resolveCard), [state.hand.cards]);
  const selectedResolvedCard = useMemo(() => {
    if (selectedHandIndex === null || selectedHandIndex >= resolvedHand.length) return null;
    return resolvedHand[selectedHandIndex];
  }, [selectedHandIndex, resolvedHand]);

  useEffect(() => { setSelectedHandIndex(null); }, [state.turnPhase]);

  const flashSparkle = useCallback((color = '#d4a437') => {
    setSparkle({ x: window.innerWidth / 2, y: window.innerHeight / 2, color });
    setTimeout(() => setSparkle(null), 700);
  }, []);

  /* ── Draw from deck ── */
  const handleDrawFromDeck = useCallback(() => {
    if (!state.river || state.river.deck.length === 0) return;
    setDrawnCard(resolveCard(state.river.deck[0]));
    flashSparkle('#d4a437');
    setTimeout(() => drawFromDeckAction(), 80);
  }, [state.river, drawFromDeckAction, flashSparkle]);

  /* ── Draw from river ── */
  const handleDrawFromRiver = useCallback((i: number) => {
    if (!state.river) return;
    const c = state.river.cards[i];
    if (!c) return;
    setDrawnCard(resolveCard(c));
    flashSparkle('#6b8cae');
    setTimeout(() => drawCard(i), 80);
  }, [state.river, drawCard, flashSparkle]);

  /* ── Discard ── */
  const handleDiscard = useCallback((i: number) => {
    vibrate(20);
    flashSparkle('#c4433a');
    discardCard(i);
    setSelectedHandIndex(null);
  }, [discardCard, flashSparkle]);

  /* ── Hand tap ── */
  const handleHandSelect = useCallback((i: number) => {
    vibrate(8);
    if (isDiscardPhase) {
      if (selectedHandIndex === i) handleDiscard(i);
      else setSelectedHandIndex(i);
    } else {
      setSelectedHandIndex(selectedHandIndex === i ? null : i);
    }
  }, [isDiscardPhase, selectedHandIndex, handleDiscard]);


  return (
    <div ref={boardRef} className="flex flex-col h-[calc(100dvh-44px)]" {...inspectHandlers}>
      {/* ═══ TOP: Header + River (scrollable) ═══ */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 sm:p-3 space-y-1.5 sm:space-y-2">

        {/* Header */}
        {state.encounter && (
          <div className="text-center">
            <h2 className="font-display text-sm sm:text-lg text-ink leading-tight">{state.encounter.name}</h2>
            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-0.5">
              <span className="text-ink-muted text-[10px] sm:text-xs">
                Target: <strong className="text-ink">{state.encounter.scoreThreshold}</strong>
              </span>
              <TurnCounter turnsLeft={turnsLeft} total={MAX_RIVER_DISCARDS} />
            </div>
            <motion.div className="flex justify-center mt-1" key={state.turnPhase} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
              <span className={clsx(
                'font-display text-[10px] sm:text-xs px-3 py-0.5 rounded-full shadow-sm',
                isDrawPhase ? 'bg-tag-flood/20 text-tag-flood border border-tag-flood/30' : 'bg-tag-fire/15 text-tag-fire border border-tag-fire/30',
              )}>
                {isDrawPhase ? '↑ Draw a card' : '↓ Discard a card'}
              </span>
            </motion.div>
            {state.encounter.bossStipulation && <div className="mt-1 text-tag-fire font-bold text-[10px]">{formatCardText(state.encounter.bossStipulation.description)}</div>}
          </div>
        )}

        {/* ── River section (grid layout) ── */}
        {state.river && (
          <div className={clsx(
            'rounded-lg p-2 border transition-colors duration-200',
            isDiscardPhase ? 'border-tag-fire/30 bg-tag-fire/5' : 'border-parchment-300/60 bg-parchment-200/20',
          )}>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="font-display text-[10px] sm:text-xs text-ink-muted uppercase tracking-wider">
                River <span className="text-ink-muted/50">({state.river.cards.length})</span>
              </h3>
              <span className="text-[8px] sm:text-[10px] text-ink-muted/50">Deck: {state.river.deck.length}</span>
            </div>

            {/* Grid of river cards + deck */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {/* Deck pile */}
              {isDrawPhase && (
                <DeckPile
                  count={state.river.deck.length}
                  onClick={handleDrawFromDeck}
                  canDraw={state.river.deck.length > 0 && state.phase === 'player_turn'}
                />
              )}

              <AnimatePresence mode="popLayout">
                {state.river.cards.map((card, i) => (
                  <RiverCard
                    key={card.instanceId}
                    card={card}
                    index={i}
                    isDrawPhase={isDrawPhase && state.phase === 'player_turn'}
                    constraintsRef={boardRef}
                    onDraw={handleDrawFromRiver}

                    onHover={setHoverCard}
                  />
                ))}
              </AnimatePresence>

              {state.river.cards.length === 0 && !isDrawPhase && (
                <div className="text-ink-muted/40 italic text-[10px] py-4 w-full text-center">River is empty</div>
              )}
            </div>

            {isDiscardPhase && (
              <motion.div className="text-center text-[8px] sm:text-[9px] text-tag-fire/50 mt-1.5" animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ repeat: Infinity, duration: 2 }}>
                Drag a hand card here to discard
              </motion.div>
            )}
          </div>
        )}

        {/* Score panel (in scroll area so it doesn't cramp hand) */}
        <div className="flex items-center justify-between gap-2">
          <ScorePanel score={liveScore} />
          <motion.button
            onClick={finalizeHand}
            disabled={state.hand.cards.length === 0}
            className="bg-tag-leader text-white font-display px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl disabled:opacity-30 text-[10px] sm:text-sm whitespace-nowrap shadow-md"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
          >
            Finalize
          </motion.button>
        </div>
      </div>

      {/* ═══ BOTTOM: Hand (fixed at bottom) ═══ */}
      <div className={clsx(
        'flex-shrink-0 border-t-2 px-2 pt-1 pb-0 safe-bottom transition-colors duration-200 overflow-visible',
        isDiscardPhase ? 'border-tag-fire/30 bg-parchment-100' : 'border-parchment-300 bg-parchment-100/80',
      )}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-0.5 px-1">
          <h3 className="font-display text-[10px] sm:text-xs text-ink-muted uppercase tracking-wider">
            Hand <span className="text-ink-muted/50">({state.hand.cards.length})</span>
          </h3>
          <AnimatePresence mode="wait">
            {isDiscardPhase && selectedHandIndex !== null && (
              <motion.span className="text-[8px] sm:text-[9px] text-tag-fire font-bold" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                Tap again to discard
              </motion.span>
            )}
            {isDrawPhase && (
              <motion.span className="text-[8px] sm:text-[9px] text-tag-flood/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Tap 🔍 to inspect
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Fan — overflow visible so dragged cards aren't clipped */}
        <div className="relative flex items-end justify-center h-[108px] sm:h-[148px] overflow-visible">
          <AnimatePresence mode="popLayout">
            {state.hand.cards.map((card, i) => (
              <HandCard
                key={card.instanceId}
                card={card}
                index={i}
                total={state.hand.cards.length}
                isSelected={selectedHandIndex === i}
                isBlanked={blankedDefIds.has(card.defId)}
                isDiscardPhase={isDiscardPhase && state.phase === 'player_turn'}
                constraintsRef={boardRef}
                onSelect={handleHandSelect}
                onDiscard={handleDiscard}
                onHover={setHoverCard}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ Relation arrows ═══ */}
      <CardRelationArrows
        selectedCard={inspectResolved ?? selectedResolvedCard}
        hand={resolvedHand}
        inspectedInstanceId={inspectResolved?.instanceId ?? null}
      />

      {/* ═══ Overlays ═══ */}
      <AnimatePresence>{sparkle && <Sparkles x={sparkle.x} y={sparkle.y} color={sparkle.color} />}</AnimatePresence>
      <AnimatePresence>{drawnCard && <DrawnCardOverlay card={drawnCard} onDone={() => setDrawnCard(null)} />}</AnimatePresence>
      <CardInspectOverlay card={inspectResolved} position={inspectPos} onClose={dismissInspect} />
      <AnimatePresence>{hoverCard && <HoverPreview card={hoverCard} />}</AnimatePresence>
    </div>
  );
}
