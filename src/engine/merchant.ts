import type { CardInstance } from '../types/card.ts';
import type { RelicInstance } from '../types/relic.ts';
import { CARD_DEFS, CARD_DEF_MAP } from '../data/cards.ts';
import { RELIC_DEF_MAP } from '../data/relics.ts';
import { SeededRNG, generateId } from '../utils/random.ts';

export interface MerchantStock {
  cards: { defId: string; price: number }[];
  relics: { defId: string; price: number }[];
  removalCost: number;
}

export function generateMerchantStock(
  pool: CardInstance[],
  ownedRelics: RelicInstance[],
  removalsThisRun: number,
  rng: SeededRNG,
): MerchantStock {
  // Cards: 4 cards not in pool
  const poolDefIds = new Set(pool.map(c => c.defId));
  const availableCards = CARD_DEFS.filter(c => !poolDefIds.has(c.id));
  const selectedCards = rng.pick(availableCards, 4);

  const cards = selectedCards.map(c => ({
    defId: c.id,
    price: calculateCardPrice(c.baseValue),
  }));

  // Relics: 3 relics not owned
  const ownedRelicIds = new Set(ownedRelics.map(r => r.defId));
  const availableRelics = [...RELIC_DEF_MAP.values()].filter(r => !ownedRelicIds.has(r.id));
  const selectedRelics = rng.pick(availableRelics, 3);

  const relics = selectedRelics.map(r => ({
    defId: r.id,
    price: calculateRelicPrice(r.rarity),
  }));

  // Removal cost increases each time
  const removalCost = 25 + removalsThisRun * 15;

  return { cards, relics, removalCost };
}

function calculateCardPrice(baseValue: number): number {
  if (baseValue >= 30) return 40;
  if (baseValue >= 20) return 25;
  return 15;
}

function calculateRelicPrice(rarity: string): number {
  switch (rarity) {
    case 'legendary': return 100;
    case 'rare': return 60;
    default: return 30;
  }
}

export function buyCard(
  pool: CardInstance[],
  gold: number,
  cardDefId: string,
  price: number,
): { pool: CardInstance[]; gold: number } | null {
  if (gold < price) return null;
  if (!CARD_DEF_MAP.has(cardDefId)) return null;

  return {
    pool: [
      ...pool,
      { instanceId: generateId(), defId: cardDefId, modifiers: [] },
    ],
    gold: gold - price,
  };
}

export function buyRelic(
  relics: RelicInstance[],
  gold: number,
  relicDefId: string,
  price: number,
): { relics: RelicInstance[]; gold: number } | null {
  if (gold < price) return null;
  if (!RELIC_DEF_MAP.has(relicDefId)) return null;
  if (relics.some(r => r.defId === relicDefId)) return null;

  return {
    relics: [
      ...relics,
      { instanceId: generateId(), defId: relicDefId },
    ],
    gold: gold - price,
  };
}

export function removeCardFromPool(
  pool: CardInstance[],
  gold: number,
  instanceId: string,
  cost: number,
): { pool: CardInstance[]; gold: number } | null {
  if (gold < cost) return null;
  const exists = pool.some(c => c.instanceId === instanceId);
  if (!exists) return null;

  return {
    pool: pool.filter(c => c.instanceId !== instanceId),
    gold: gold - cost,
  };
}
