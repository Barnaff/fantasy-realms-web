import type { GameState, Encounter, DraftOption, RivalIntent } from '../types/game.ts';
import type { River } from '../types/game.ts';
import type { EncounterModifier } from '../types/game.ts';
import { CARD_DEFS } from '../data/cards.ts';
import { RELIC_DEF_MAP } from '../data/relics.ts';
import { SeededRNG, randomSeed, generateId } from '../utils/random.ts';
import { generateMap } from './map.ts';
import { createStartingPool } from './pool.ts';
import { createRiver, dealInitialHand } from './river.ts';
import { scoreHand, resolveCard } from './scoring.ts';

export function createInitialGameState(): GameState {
  return {
    phase: 'title',
    run: null,
    encounter: null,
    river: null,
    hand: { cards: [], maxSize: 7 },
    discardPile: [],
    exhaustedCards: [],
    turnsRemaining: 0,
    turnPhase: 'draw',
    riverDiscardCount: 0,
    relics: [],
    lastScoreResult: null,
    pendingChoice: null,
    postEncounterReward: null,
    draftOptions: null,
    actionLog: [],
    rivalIntent: null,
    rivalCardsTaken: 0,
    rivalHand: [],
  };
}

export function generateDraftOptions(rng: SeededRNG): DraftOption[] {
  const commons = CARD_DEFS.filter(c => c.rarity === 'common');
  const rares = CARD_DEFS.filter(c => c.rarity === 'rare');
  const epics = CARD_DEFS.filter(c => c.rarity === 'epic');
  const usedIds = new Set<string>();

  function pickUnique(pool: typeof CARD_DEFS, count: number) {
    const available = pool.filter(c => !usedIds.has(c.id));
    const picks = rng.pick(available, Math.min(count, available.length));
    for (const p of picks) usedIds.add(p.id);
    return picks.map(c => c.id);
  }

  // 3 options with different card counts and rarity budgets:
  // Option A: 3 cards — 1 epic + 1 rare + 1 common (quality)
  // Option B: 4 cards — 1 rare + 3 commons (balanced)
  // Option C: 5 cards — 5 commons (quantity)
  // Randomize which slot gets which template
  const templates = rng.shuffle([
    () => {
      const e = pickUnique(epics, 1);
      const r = pickUnique(rares, 1);
      const c = pickUnique(commons, 1);
      return [...e, ...r, ...c];
    },
    () => {
      // 50% chance for 1 rare + 3 common, 50% chance for 2 rare + 2 common
      if (rng.next() < 0.5) {
        const r = pickUnique(rares, 1);
        const c = pickUnique(commons, 3);
        return [...r, ...c];
      } else {
        const r = pickUnique(rares, 2);
        const c = pickUnique(commons, 2);
        return [...r, ...c];
      }
    },
    () => {
      // 5 cards — mostly common, small chance for 1 rare
      if (rng.next() < 0.2) {
        const r = pickUnique(rares, 1);
        const c = pickUnique(commons, 4);
        return [...r, ...c];
      }
      return pickUnique(commons, 5);
    },
  ]);

  return templates.map(fn => ({
    id: generateId(),
    cardIds: fn(),
  }));
}

export function startRun(seed?: number): GameState {
  const actualSeed = seed ?? randomSeed();
  const rng = new SeededRNG(actualSeed);

  const pool = createStartingPool(rng);
  const map = generateMap(rng);
  const draftOptions = generateDraftOptions(rng);

  return {
    phase: 'draft_pick',
    run: {
      seed: actualSeed,
      pool,
      map,
      currentNodeId: 'start',
      completedNodeIds: ['start'],
      totalScore: 0,
      gold: 50,
      encountersCleared: 0,
      skippedCardCounts: {},
    },
    encounter: null,
    river: null,
    hand: { cards: [], maxSize: 7 },
    discardPile: [],
    exhaustedCards: [],
    turnsRemaining: 0,
    turnPhase: 'draw',
    riverDiscardCount: 0,
    relics: [],
    lastScoreResult: null,
    pendingChoice: null,
    postEncounterReward: null,
    draftOptions,
    actionLog: [],
    rivalIntent: null,
    rivalCardsTaken: 0,
    rivalHand: [],
  };
}

export function startEncounter(
  state: GameState,
  encounter: Encounter,
): GameState {
  if (!state.run) throw new Error('No active run');

  const rng = new SeededRNG(state.run.seed + state.run.encountersCleared * 1000);

  // Determine hand size (may be modified by boss stipulation or relics)
  let maxSize = 7;
  if (encounter.bossStipulation?.effectId === 'reduceHandSize') {
    maxSize = encounter.bossStipulation.params.maxSize as number;
  }
  for (const relic of state.relics) {
    const relicDef = RELIC_DEF_MAP.get(relic.defId);
    if (relicDef?.effectId === 'handSizeBonus') {
      maxSize += relicDef.params.bonus as number;
    }
  }

  // Shuffle a copy of the pool for this encounter's deck
  const encounterDeck = rng.shuffle([...state.run.pool]);

  // Create river (starts empty) and deal initial hand from deck
  const emptyRiver = createRiver(encounterDeck);
  let { river: currentRiver, hand: currentHand } = dealInitialHand(emptyRiver, maxSize);

  // Anti-highroll: if initial hand already beats the target score, reshuffle and redeal
  const maxRedraws = 3;
  for (let i = 0; i < maxRedraws; i++) {
    const score = scoreHand(currentHand.cards, state.relics, encounter.modifiers ?? []);
    if (score.totalScore <= encounter.scoreThreshold) break;

    const allCards = [...currentHand.cards, ...currentRiver.cards, ...currentRiver.deck];
    const reshuffled = rng.shuffle(allCards);
    const freshRiver = createRiver(reshuffled);
    const result = dealInitialHand(freshRiver, maxSize);
    currentRiver = result.river;
    currentHand = result.hand;
  }

  // Calculate first rival intent
  const rivalRng = new SeededRNG(state.run.seed + 9999);
  const rivalIntent = calculateRivalIntent(currentRiver, encounter.modifiers, rivalRng);

  return {
    ...state,
    phase: 'player_turn',
    encounter,
    river: currentRiver,
    hand: currentHand,
    discardPile: [],
    exhaustedCards: [],
    turnsRemaining: 0,
    turnPhase: 'draw',
    riverDiscardCount: 0,
    lastScoreResult: null,
    pendingChoice: null,
    postEncounterReward: null,
    actionLog: [
      ...state.actionLog,
      { type: 'encounter_started', encounterName: encounter.name },
    ],
    rivalIntent,
    rivalCardsTaken: 0,
    rivalHand: [],
  };
}

export function useAction(state: GameState): GameState {
  return {
    ...state,
    turnsRemaining: state.turnsRemaining - 1,
  };
}

export function navigateToNode(state: GameState, nodeId: string): GameState {
  if (!state.run) throw new Error('No active run');

  return {
    ...state,
    run: {
      ...state.run,
      currentNodeId: nodeId,
      completedNodeIds: [...state.run.completedNodeIds, nodeId],
    },
  };
}

/**
 * Calculate which card the rival intends to take.
 * Priority: cards matching encounter's positive modifier tags (highest baseValue),
 * then random river card (60%) or deck (40%).
 */
export function calculateRivalIntent(
  river: River,
  modifiers: EncounterModifier[] | undefined,
  rng: SeededRNG,
): RivalIntent {
  if (river.cards.length === 0 && river.deck.length === 0) return null;
  if (river.cards.length === 0) return { type: 'deck' };

  // Positive modifier tags = tags the encounter rewards
  const positiveTags = (modifiers ?? [])
    .filter(m => m.value > 0)
    .map(m => m.tag);

  if (positiveTags.length > 0) {
    // Find river cards matching positive tags, pick highest baseValue
    let bestCard: { instanceId: string; baseValue: number } | null = null;
    for (const inst of river.cards) {
      const resolved = resolveCard(inst);
      const matches = resolved.tags.some(t => positiveTags.includes(t));
      if (matches && (!bestCard || resolved.baseValue > bestCard.baseValue)) {
        bestCard = { instanceId: inst.instanceId, baseValue: resolved.baseValue };
      }
    }
    if (bestCard) return { type: 'river', cardInstanceId: bestCard.instanceId };
  }

  // No tag match — 60% random river card, 40% deck
  if (river.deck.length > 0 && rng.next() < 0.4) {
    return { type: 'deck' };
  }

  // Random river card
  const idx = Math.floor(rng.next() * river.cards.length);
  return { type: 'river', cardInstanceId: river.cards[idx].instanceId };
}
