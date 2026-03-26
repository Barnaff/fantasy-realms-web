import type { GameState, Encounter } from '../types/game.ts';
import { RELIC_DEF_MAP } from '../data/relics.ts';
import { SeededRNG, randomSeed } from '../utils/random.ts';
import { generateMap } from './map.ts';
import { createStartingPool } from './pool.ts';
import { createRiver, dealInitialHand } from './river.ts';

export function createInitialGameState(): GameState {
  return {
    phase: 'title',
    run: null,
    encounter: null,
    river: null,
    hand: { cards: [], maxSize: 7 },
    discardPile: [],
    turnsRemaining: 0,
    turnPhase: 'draw',
    riverDiscardCount: 0,
    relics: [],
    lastScoreResult: null,
    pendingChoice: null,
    postEncounterReward: null,
    actionLog: [],
  };
}

export function startRun(seed?: number): GameState {
  const actualSeed = seed ?? randomSeed();
  const rng = new SeededRNG(actualSeed);

  const pool = createStartingPool(rng);
  const map = generateMap(rng);

  return {
    phase: 'map',
    run: {
      seed: actualSeed,
      pool,
      map,
      currentNodeId: 'start',
      completedNodeIds: ['start'],
      totalScore: 0,
      gold: 50,
      encountersCleared: 0,
    },
    encounter: null,
    river: null,
    hand: { cards: [], maxSize: 7 },
    discardPile: [],
    turnsRemaining: 0,
    turnPhase: 'draw',
    riverDiscardCount: 0,
    relics: [],
    lastScoreResult: null,
    pendingChoice: null,
    postEncounterReward: null,
    actionLog: [],
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
  const { river, hand } = dealInitialHand(emptyRiver, maxSize);

  return {
    ...state,
    phase: 'player_turn',
    encounter,
    river,
    hand,
    discardPile: [],
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
