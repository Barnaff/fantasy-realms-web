import { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../hooks/useGameStore.ts';
import { CARD_DEF_MAP } from '../../data/cards.ts';
import { RELIC_DEF_MAP } from '../../data/relics.ts';
import { resolveCard } from '../../engine/scoring.ts';
import { Card } from '../card/Card.tsx';
import { CardInspectOverlay } from '../card/CardInspectOverlay.tsx';
import { useInspectGesture } from '../../hooks/useInspectGesture.ts';
import type { ResolvedCard } from '../../types/card.ts';

export function MerchantScreen() {
  const state = useGameStore(s => s.state);
  const merchantStock = useGameStore(s => s.merchantStock);
  const merchantBuyCard = useGameStore(s => s.merchantBuyCard);
  const merchantBuyRelic = useGameStore(s => s.merchantBuyRelic);
  const merchantRemoveCard = useGameStore(s => s.merchantRemoveCard);
  const leaveMerchant = useGameStore(s => s.leaveMerchant);

  // Build resolver map for all visible cards (merchant stock + pool)
  const cardMap = useMemo(() => {
    const m = new Map<string, ResolvedCard>();
    if (merchantStock) {
      for (const item of merchantStock.cards) {
        const def = CARD_DEF_MAP.get(item.defId);
        if (def) {
          const r: ResolvedCard = {
            instanceId: `merchant_${item.defId}`, defId: item.defId,
            name: def.name, tags: [...def.tags], baseValue: def.baseValue,
            scoringEffects: def.scoringEffects, discardEffect: def.discardEffect,
          };
          m.set(r.instanceId, r);
        }
      }
    }
    if (state.run) {
      for (const c of state.run.pool) {
        const r = resolveCard(c);
        m.set(r.instanceId, r);
      }
    }
    return m;
  }, [merchantStock, state.run]);

  const { inspectCard, inspectPos, dismiss, containerHandlers, isActive } = useInspectGesture(
    useCallback((id: string) => cardMap.get(id) ?? null, [cardMap]),
  );

  if (!merchantStock || !state.run) return null;

  const gold = state.run.gold;

  return (
    <div className="min-h-[100dvh] bg-parchment-100 flex flex-col" {...containerHandlers}>
      {/* Header */}
      <div className="text-center pt-4 pb-2 px-4 flex-shrink-0">
        <h2 className="font-display text-xl sm:text-3xl text-ink mb-1">Merchant</h2>
        <div className="font-display text-base sm:text-lg text-gold">Gold: {gold}</div>
        <p className="text-ink-muted/50 text-[9px] mt-1">Hold any card to inspect · slide to compare</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 pb-6 space-y-4">

        {/* Cards for sale */}
        <section>
          <h3 className="font-display text-sm sm:text-base text-ink-muted mb-2">Cards for Sale</h3>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 snap-x -mx-1 px-1 sm:flex-wrap sm:justify-start">
            {merchantStock.cards.map(item => {
              const def = CARD_DEF_MAP.get(item.defId);
              if (!def) return null;
              const resolved: ResolvedCard = {
                instanceId: `merchant_${item.defId}`, defId: item.defId,
                name: def.name, tags: [...def.tags], baseValue: def.baseValue,
                scoringEffects: def.scoringEffects, discardEffect: def.discardEffect,
              };
              const canAfford = gold >= item.price;
              return (
                <div key={item.defId} className="flex flex-col items-center gap-1 snap-center flex-shrink-0">
                  <Card card={resolved} dimmed={!canAfford} />
                  <button
                    onClick={() => { if (!isActive.current) merchantBuyCard(item.defId, item.price); }}
                    disabled={!canAfford}
                    className="bg-tag-leader text-white font-display text-[10px] sm:text-xs px-3 py-1 rounded-lg disabled:opacity-40 active:scale-95 transition-all whitespace-nowrap"
                  >
                    Buy {item.price}g
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Relics */}
        <section>
          <h3 className="font-display text-sm sm:text-base text-ink-muted mb-2">Relics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {merchantStock.relics.map(item => {
              const def = RELIC_DEF_MAP.get(item.defId);
              if (!def) return null;
              const canAfford = gold >= item.price;
              return (
                <div key={item.defId} className="bg-parchment-50 border border-parchment-300 rounded-lg p-2 sm:p-3">
                  <div className="font-display text-xs sm:text-sm font-bold text-ink leading-tight">{def.name}</div>
                  <div className="text-[10px] sm:text-xs text-ink-muted mt-0.5 line-clamp-2">{def.description}</div>
                  <div className="text-[9px] text-ink-muted/60 capitalize mt-0.5">{def.rarity}</div>
                  <button
                    onClick={() => merchantBuyRelic(item.defId, item.price)}
                    disabled={!canAfford}
                    className="mt-1.5 w-full bg-tag-wizard text-white font-display text-[10px] sm:text-xs px-2 py-1 rounded-lg disabled:opacity-40 active:scale-95 transition-all"
                  >
                    Buy {item.price}g
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Remove cards */}
        <section>
          <h3 className="font-display text-sm sm:text-base text-ink-muted mb-2">
            Remove a card <span className="text-ink-muted/60">({merchantStock.removalCost}g)</span>
          </h3>
          <div className="flex gap-1.5 flex-wrap">
            {state.run.pool.map(card => {
              const resolved = resolveCard(card);
              const canAfford = gold >= merchantStock.removalCost;
              return (
                <Card
                  key={card.instanceId}
                  card={resolved}
                  scale={0.72}
                  dimmed={!canAfford}
                  onClick={() => { if (!isActive.current && canAfford) merchantRemoveCard(card.instanceId); }}
                />
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 text-center safe-bottom">
        <motion.button
          onClick={leaveMerchant}
          className="bg-parchment-500 text-white font-display px-8 py-2.5 rounded-xl shadow-md text-sm"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
        >
          Leave Merchant
        </motion.button>
      </div>

      <CardInspectOverlay card={inspectCard} position={inspectPos} onClose={dismiss} />
    </div>
  );
}
