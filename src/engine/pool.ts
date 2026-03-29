import type { CardDef, CardInstance } from '../types/card.ts';
import type { CardRewardOption, PostEncounterReward } from '../types/game.ts';
import type { RelicInstance } from '../types/relic.ts';
import { CARD_DEFS, CARD_DEF_MAP } from '../data/cards.ts';
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

/**
 * Find card IDs directly referenced by name in pool cards' scoring effects.
 * Only counts explicit cardId references (bonusIfCardPresent, penaltyIfCardPresent, etc.)
 */
function getPoolReferencedCardIds(pool: CardInstance[]): Set<string> {
  const refs = new Set<string>();
  for (const inst of pool) {
    const def = CARD_DEF_MAP.get(inst.defId);
    if (!def) continue;
    for (const eff of def.scoringEffects) {
      const cardId = eff.params.cardId as string | undefined;
      if (cardId) refs.add(cardId);
    }
  }
  return refs;
}



/**
 * Reward option templates. Each template defines the composition of a reward group.
 */
type TemplateSlot =
  | { type: 'rarity'; rarity: string; sameSuiteAs?: number }
  | { type: 'diffSuite'; rarity: string }
  | { type: 'referenced' };

interface RewardTemplate {
  label: string;
  slots: TemplateSlot[];
}

const REWARD_TEMPLATES: RewardTemplate[] = [
  { label: '2 Common (same suite)', slots: [
    { type: 'rarity', rarity: 'common' },
    { type: 'rarity', rarity: 'common', sameSuiteAs: 0 },
  ]},
  { label: '1 Common + 1 Rare', slots: [
    { type: 'rarity', rarity: 'common' },
    { type: 'diffSuite', rarity: 'rare' },
  ]},
  { label: '2 Common + 1 Rare', slots: [
    { type: 'rarity', rarity: 'common' },
    { type: 'diffSuite', rarity: 'common' },
    { type: 'diffSuite', rarity: 'rare' },
  ]},
  { label: '1 Epic + 1 Common', slots: [
    { type: 'rarity', rarity: 'epic' },
    { type: 'diffSuite', rarity: 'common' },
  ]},
  { label: '1 Referenced + 1 Common', slots: [
    { type: 'referenced' },
    { type: 'diffSuite', rarity: 'common' },
  ]},
  { label: '3 Common (different suites)', slots: [
    { type: 'rarity', rarity: 'common' },
    { type: 'diffSuite', rarity: 'common' },
    { type: 'diffSuite', rarity: 'common' },
  ]},
];

function pickByRarity(
  available: CardDef[], rarity: string, rng: SeededRNG,
  usedIds: Set<string>, excludeTags?: Set<string>, requireTag?: string,
): CardDef | null {
  let pool = available.filter(c =>
    c.rarity === rarity && !usedIds.has(c.id) &&
    (!excludeTags || !c.tags.some(t => excludeTags.has(t))) &&
    (!requireTag || (c.tags as string[]).includes(requireTag))
  );
  if (pool.length === 0) {
    // Fallback: ignore tag constraints
    pool = available.filter(c => c.rarity === rarity && !usedIds.has(c.id));
  }
  if (pool.length === 0) return null;
  return rng.pick(pool, 1)[0];
}

function buildOption(
  template: RewardTemplate,
  available: CardDef[],
  referencedIds: Set<string>,
  rng: SeededRNG,
  globalUsedIds: Set<string>,
): CardRewardOption | null {
  const picked: CardDef[] = [];
  const localUsedIds = new Set(globalUsedIds);
  const usedTags = new Set<string>();

  for (let si = 0; si < template.slots.length; si++) {
    const slot = template.slots[si];
    let card: CardDef | null = null;

    switch (slot.type) {
      case 'referenced': {
        const refs = available.filter(c => referencedIds.has(c.id) && !localUsedIds.has(c.id));
        card = refs.length > 0
          ? rng.pick(refs, 1)[0]
          : pickByRarity(available, 'common', rng, localUsedIds);
        break;
      }
      case 'rarity': {
        if (slot.sameSuiteAs !== undefined) {
          const refCard = picked[slot.sameSuiteAs];
          const requireTag = refCard?.tags[0];
          card = pickByRarity(available, slot.rarity, rng, localUsedIds, undefined, requireTag);
        } else {
          card = pickByRarity(available, slot.rarity, rng, localUsedIds);
        }
        break;
      }
      case 'diffSuite': {
        card = pickByRarity(available, slot.rarity, rng, localUsedIds, usedTags);
        break;
      }
    }

    if (!card) return null; // template can't be filled
    picked.push(card);
    localUsedIds.add(card.id);
    for (const t of card.tags) usedTags.add(t);
  }

  // Commit used IDs globally
  for (const c of picked) globalUsedIds.add(c.id);

  return {
    cards: picked.map(c => c.id),
    label: `Option`,
  };
}

export function generateCardRewards(
  pool: CardInstance[],
  _rewardTier: 'normal' | 'elite' | 'boss',
  rng: SeededRNG,
  skippedCounts: Record<string, number> = {},
): CardRewardOption[] {
  const poolDefIds = new Set(pool.map(c => c.defId));

  // Filter available — exclude pool cards, starting rarity, apply skip penalty
  const available = CARD_DEFS.filter(c => {
    if (poolDefIds.has(c.id) || c.rarity === 'starting') return false;
    const skipCount = skippedCounts[c.id] || 0;
    if (skipCount > 0) {
      const keepChance = Math.max(0, 1 - skipCount * 0.05);
      if (rng.next() > keepChance) return false;
    }
    return true;
  });

  if (available.length === 0) return [];

  const referencedIds = getPoolReferencedCardIds(pool);
  const globalUsedIds = new Set<string>();

  // Pick 3 random templates (no duplicates)
  const shuffled = rng.shuffle([...REWARD_TEMPLATES]);
  const options: CardRewardOption[] = [];

  for (const template of shuffled) {
    if (options.length >= 3) break;
    const option = buildOption(template, available, referencedIds, rng, globalUsedIds);
    if (option) options.push(option);
  }

  return options;
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
  skippedCounts: Record<string, number> = {},
): PostEncounterReward {
  const cardChoices = generateCardRewards(pool, rewardTier, rng, skippedCounts);
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
