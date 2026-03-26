import type { CardDef, CardInstance, Tag } from '../types/card.ts';
import type { PostEncounterReward } from '../types/game.ts';
import type { RelicInstance } from '../types/relic.ts';
import { CARD_DEFS } from '../data/cards.ts';
import { RELIC_DEF_MAP } from '../data/relics.ts';
import { SeededRNG, generateId } from '../utils/random.ts';

export function createStartingPool(rng: SeededRNG): CardInstance[] {
  // Pick ~25 cards from the full set for the starting pool
  // Ensure at least 2 cards from each of several tags for variety
  const selected: CardDef[] = [];
  const usedIds = new Set<string>();

  // Ensure some diversity: pick 2 from each of several key tags
  const starterTags: Tag[] = ['Beast', 'Fire', 'Weapon', 'Leader', 'Land', 'Wizard', 'Army'];
  for (const tag of starterTags) {
    const tagged = CARD_DEFS.filter(c => c.tags.includes(tag) && !usedIds.has(c.id));
    const picks = rng.pick(tagged, 2);
    for (const pick of picks) {
      selected.push(pick);
      usedIds.add(pick.id);
    }
  }

  // Fill up to 25 with random remaining cards
  const remaining = CARD_DEFS.filter(c => !usedIds.has(c.id));
  const extras = rng.pick(remaining, 25 - selected.length);
  selected.push(...extras);

  return selected.map(def => ({
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
  let base: number;
  switch (rewardTier) {
    case 'boss':
      base = 50;
      break;
    case 'elite':
      base = 30;
      break;
    default:
      base = 15;
  }

  // Bonus for exceeding threshold
  const excess = Math.max(0, score - threshold);
  const bonus = Math.floor(excess / 10) * 5;

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
