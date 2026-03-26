import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../hooks/useGameStore.ts';
import { CARD_DEF_MAP } from '../../data/cards.ts';
import { RELIC_DEF_MAP } from '../../data/relics.ts';
import { Card } from '../card/Card.tsx';
import { CardInspectOverlay } from '../card/CardInspectOverlay.tsx';
import { HoverPreview, type HoverInfo } from '../card/HoverPreview.tsx';
import { useInspectGesture } from '../../hooks/useInspectGesture.ts';
import { clsx } from 'clsx';
import type { ResolvedCard } from '../../types/card.ts';

export function PostEncounterScreen() {
  const state = useGameStore(s => s.state);
  const selectCardReward = useGameStore(s => s.selectCardReward);
  const skipCardReward = useGameStore(s => s.skipCardReward);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  const reward = state.postEncounterReward;

  const cardOptions = useMemo(() => {
    if (!reward) return [];
    return reward.cardChoices.map(id => {
      const def = CARD_DEF_MAP.get(id);
      if (!def) return null;
      return {
        instanceId: `preview_${id}`,
        defId: id,
        name: def.name,
        tags: [...def.tags],
        baseValue: def.baseValue,
        scoringEffects: def.scoringEffects,
        discardEffect: def.discardEffect,
        art: def.art,
        flavor: def.flavor,
      } as ResolvedCard;
    }).filter(Boolean) as ResolvedCard[];
  }, [reward]);

  // Build a map for the inspect gesture resolver
  const cardMap = useMemo(() => {
    const m = new Map<string, ResolvedCard>();
    for (const c of cardOptions) m.set(c.instanceId, c);
    return m;
  }, [cardOptions]);

  const { inspectCard, inspectPos, dismiss, containerHandlers, isActive } = useInspectGesture(
    useCallback((id: string) => cardMap.get(id) ?? null, [cardMap]),
  );

  if (!reward) return null;

  const relicDef = reward.relicChoice ? RELIC_DEF_MAP.get(reward.relicChoice) : null;

  const handleSelect = (idx: number) => {
    // Don't select if we just finished a long-press inspect
    if (isActive.current) return;
    if (selectedIdx === idx) {
      selectCardReward(cardOptions[idx].defId);
    } else {
      setSelectedIdx(idx);
    }
  };

  return (
    <div
      className="min-h-[100dvh] bg-parchment-100 flex flex-col items-center justify-center p-4 safe-bottom"
      {...containerHandlers}
    >
      {/* Header */}
      <motion.h2
        className="font-display text-2xl sm:text-3xl text-ink mb-1"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        Rewards
      </motion.h2>
      <motion.div
        className="text-gold font-display text-lg sm:text-xl mb-4"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        +{reward.gold} Gold
      </motion.div>

      <p className="text-ink-muted text-xs sm:text-sm mb-3 text-center">
        Choose a card · hold to preview
      </p>

      {/* Cards */}
      <div className="flex gap-2 sm:gap-3 justify-center mb-2">
        {cardOptions.map((card, i) => (
          <motion.div
            key={card.defId}
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 + i * 0.08 }}
          >
            <div
              className={clsx(
                'rounded-lg transition-all duration-200',
                selectedIdx === i
                  ? 'ring-2 ring-gold shadow-[0_0_12px_rgba(212,164,55,0.4)] scale-105 -translate-y-1'
                  : '',
              )}
              onMouseEnter={(e) => setHoverInfo({ card, rect: e.currentTarget.getBoundingClientRect() })}
              onMouseLeave={() => setHoverInfo(null)}
            >
              <Card
                card={card}
                selected={selectedIdx === i}
                onClick={() => handleSelect(i)}
              />
            </div>
            {selectedIdx === i && (
              <motion.span
                className="text-gold font-display text-[9px] sm:text-[10px] mt-1 font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Tap to confirm
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Relic reward */}
      <AnimatePresence>
        {relicDef && (
          <motion.div
            className="mt-2 mb-3 bg-parchment-50 border-2 border-tag-artifact rounded-xl p-3 sm:p-4 text-center max-w-[260px]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="font-display text-sm text-tag-artifact mb-0.5">Relic Found!</h3>
            <div className="font-display text-base text-ink">{relicDef.name}</div>
            <div className="text-xs text-ink-muted mt-1">{relicDef.description}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip */}
      <button
        onClick={skipCardReward}
        className="text-ink-muted text-sm underline hover:text-ink transition-colors active:scale-95 mt-2"
      >
        Skip card reward
      </button>

      <CardInspectOverlay card={inspectCard} position={inspectPos} onClose={dismiss} />
      <HoverPreview info={hoverInfo} />
    </div>
  );
}
