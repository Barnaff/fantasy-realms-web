import type { CardInstance } from '../types/card.ts';
import type { PostEncounterReward } from '../types/game.ts';
import type { RelicInstance } from '../types/relic.ts';
import { CARD_DEFS } from '../data/cards.ts';
import { RELIC_DEF_MAP } from '../data/relics.ts';
import { SeededRNG, generateId } from '../utils/random.ts';

export function createStartingPool(_rng: SeededRNG): CardInstance[] {
  // All players start with the same deck: all cards with rarity 'starting'
  const startingCards = CARD_DEFS.filter(c => c.rarity === 'starting');

  return startingCards.map(def => ({
    instanceId: generateId(),
    defId: def.id,
    modifiers: [],
  }));
}

export function generateCardRewards(
  pool: CardInstance[],
  rewardTier: 'normal' | 'elite' | 'boss',
  rng: SeededRNG,
): string[] {
  const poolDefIds = new Set(pool.map(c => c.defId));
  const available = CARD_DEFS.filter(c => !poolDefIds.has(c.id));

  if (available.length === 0) return [];

  let count: number;
  switch (rewardTier) {
    case 'boss':
      count = 4;
      break;
    case 'elite':
      count = 3;
      break;
    default:
      count = 3;
  }

  // For boss tier, prefer higher base value cards
  if (rewardTier === 'boss') {
    const sorted = [...available].sort((a, b) => b.baseValue - a.baseValue);
    const topHalf = sorted.slice(0, Math.ceil(sorted.length / 2));
    return rng.pick(topHalf, count).map(c => c.id);
  }

  return rng.pick(available, count).map(c => c.id);
}

export function addCardToPool(pool: CardInstance[], cardDefId: string): CardInstance[] {
  return [
    ...pool,
    {
      instanceId: generateId(),
      defId: cardDefId,
      modifiers: [],
    },
  ];
}

export function removeCardFromPool(pool: CardInstance[], instanceId: string): CardInstance[] {
  return pool.filter(c => c.instanceId !== instanceId);
}

export function calculateGoldReward(
  score: number,
  threshold: number,
  rewardTier: 'normal' | 'elite' | 'boss',
  relics: RelicInstance[],
): number {
  // Base gold scales with difficulty tier (8-15 range for normal)
  let base: number;
  switch (rewardTier) {
    case 'boss':
      base = 15;
      break;
    case 'elite':
      base = 12;
      break;
    default:
      base = 8;
  }

  // +1 gold for every 5 points over the target score
  const excess = Math.max(0, score - threshold);
  const bonus = Math.floor(excess / 5);

  let total = base + bonus;

  // Apply gold bonus relics
  for (const relic of relics) {
    const relicDef = RELIC_DEF_MAP.get(relic.defId);
    if (relicDef?.effectId === 'goldBonus') {
      total += relicDef.params.bonus as number;
    }
  }

  return total;
}

export function generatePostEncounterReward(
  pool: CardInstance[],
  score: number,
  threshold: number,
  rewardTier: 'normal' | 'elite' | 'boss',
  relics: RelicInstance[],
  rng: SeededRNG,
): PostEncounterReward {
  const cardChoices = generateCardRewards(pool, rewardTier, rng);
  const gold = calculateGoldReward(score, threshold, rewardTier, relics);

  return {
    cardChoices,
    gold,
    relicChoice: rewardTier === 'boss' ? generateRelicReward(relics, rng) : undefined,
  };
}

function generateRelicReward(
  ownedRelics: RelicInstance[],
  rng: SeededRNG,
): string | undefined {
  const ownedIds = new Set(ownedRelics.map(r => r.defId));
  const available = [...RELIC_DEF_MAP.values()].filter(
    r => !ownedIds.has(r.id) && (r.rarity === 'rare' || r.rarity === 'legendary'),
  );

  if (available.length === 0) return undefined;
  return rng.pick(available, 1)[0].id;
}
