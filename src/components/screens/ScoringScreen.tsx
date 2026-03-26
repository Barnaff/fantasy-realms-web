import { useCallback, useMemo } from 'react';
import { useGameStore } from '../../hooks/useGameStore.ts';
import { resolveCard } from '../../engine/scoring.ts';
import { Card } from '../card/Card.tsx';
import { CardInspectOverlay } from '../card/CardInspectOverlay.tsx';
import { formatCardText } from '../card/CardText.tsx';
import { useInspectGesture } from '../../hooks/useInspectGesture.ts';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import type { ResolvedCard } from '../../types/card.ts';

export function ScoringScreen() {
  const state = useGameStore(s => s.state);
  const acknowledgeScore = useGameStore(s => s.acknowledgeScore);
  const score = state.lastScoreResult;
  const encounter = state.encounter;

  // Build resolver map from hand cards
  const cardMap = useMemo(() => {
    const m = new Map<string, ResolvedCard>();
    for (const c of state.hand.cards) {
      const r = resolveCard(c);
      m.set(r.instanceId, r);
    }
    return m;
  }, [state.hand.cards]);

  const { inspectCard, inspectPos, dismiss, containerHandlers } = useInspectGesture(
    useCallback((id: string) => cardMap.get(id) ?? null, [cardMap]),
  );

  if (!score || !encounter) return null;

  const passed = score.totalScore >= encounter.scoreThreshold;

  return (
    <div className="min-h-[100dvh] bg-parchment-100 flex flex-col" {...containerHandlers}>
      {/* Header */}
      <div className="text-center pt-6 pb-2 px-4 flex-shrink-0">
        <motion.div
          className={clsx('font-display text-2xl sm:text-4xl mb-2', passed ? 'text-tag-beast' : 'text-tag-fire')}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
        >
          {passed ? 'Victory!' : 'Defeated...'}
        </motion.div>

        <div className="text-ink-muted text-sm">
          <span className="font-display">{encounter.name}</span>
          <span className="mx-2">&mdash;</span>
          <strong className={clsx('text-lg', passed ? 'text-tag-beast' : 'text-tag-fire')}>
            {score.totalScore}
          </strong>
          <span className="text-ink-muted"> / {encounter.scoreThreshold}</span>
        </div>
      </div>

      {/* Scrollable card breakdown */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 pb-6">
        <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar pb-3 snap-x -mx-1 px-1 sm:flex-wrap sm:justify-center">
          {state.hand.cards.map((card, i) => {
            const resolved = resolveCard(card);
            const entry = score.breakdown.find(b => b.cardId === card.defId);
            return (
              <motion.div
                key={card.instanceId}
                className="flex flex-col items-center gap-1 snap-center flex-shrink-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card card={resolved} blanked={entry?.blanked} />
                <div className={clsx(
                  'font-display text-base sm:text-lg',
                  entry?.blanked ? 'text-ink-muted line-through' :
                  (entry?.finalValue ?? 0) > resolved.baseValue ? 'text-tag-beast' :
                  (entry?.finalValue ?? 0) < resolved.baseValue ? 'text-tag-fire' :
                  'text-ink',
                )}>
                  {entry?.blanked ? '0' : entry?.finalValue ?? 0}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Detailed breakdown */}
        <div className="mt-3 space-y-1.5 max-w-md mx-auto">
          {score.breakdown.map(entry => (
            <div
              key={entry.cardId}
              className={clsx(
                'flex justify-between items-start text-xs sm:text-sm bg-parchment-50/50 rounded-lg px-3 py-1.5',
                entry.blanked && 'opacity-40',
              )}
            >
              <div className="min-w-0">
                <span className="font-bold text-ink">{entry.cardName}</span>
                <span className="text-ink-muted ml-1 text-[10px]">(base {entry.baseValue})</span>
                {entry.bonuses.map((b, i) => (
                  <div key={`b${i}`} className="text-tag-beast text-[10px] sm:text-xs ml-2">+{b.value}: {formatCardText(b.description)}</div>
                ))}
                {entry.penalties.map((p, i) => (
                  <div key={`p${i}`} className="text-tag-fire text-[10px] sm:text-xs ml-2">{p.value}: {formatCardText(p.description)}</div>
                ))}
              </div>
              <span className={clsx(
                'font-bold ml-2 whitespace-nowrap font-display',
                entry.blanked ? 'text-ink-muted line-through' :
                entry.finalValue > entry.baseValue ? 'text-tag-beast' :
                entry.finalValue < entry.baseValue ? 'text-tag-fire' : 'text-ink',
              )}>
                {entry.blanked ? 'BLANKED' : entry.finalValue}
              </span>
            </div>
          ))}
        </div>

        {score.relicBonuses.length > 0 && (
          <div className="mt-3 text-center">
            {score.relicBonuses.map((rb, i) => (
              <div key={i} className="text-tag-artifact text-sm">
                {rb.relicName}: +{rb.value}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer button */}
      <div className="flex-shrink-0 p-4 text-center safe-bottom">
        <motion.button
          onClick={acknowledgeScore}
          className={clsx(
            'font-display text-base sm:text-lg px-8 py-2.5 rounded-xl text-white shadow-lg',
            passed ? 'bg-tag-beast' : 'bg-tag-fire',
          )}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
        >
          {passed ? 'Continue' : 'End Run'}
        </motion.button>
      </div>

      <CardInspectOverlay card={inspectCard} position={inspectPos} onClose={dismiss} />
    </div>
  );
}
