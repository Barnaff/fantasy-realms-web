import { create } from 'zustand';
import type { GameState } from '../types/game.ts';
import type { ResolvedCard } from '../types/card.ts';
import { createInitialGameState, startRun, startEncounter, navigateToNode } from '../engine/run.ts';
import { drawFromRiver, drawFromDeck, discardToRiver } from '../engine/river.ts';
import { MAX_RIVER_DISCARDS } from '../types/game.ts';
import { scoreHand, resolveCard } from '../engine/scoring.ts';
import { executeDiscardEffect } from '../engine/effects.ts';
import { addCardToPool, generatePostEncounterReward } from '../engine/pool.ts';
import { generateMerchantStock, buyCard, buyRelic, removeCardFromPool, type MerchantStock } from '../engine/merchant.ts';
import { generateEncounterForNode, generateBossEncounter } from '../engine/encounters.ts';
import { getAvailableNodes, markNodeVisited, findNode } from '../engine/map.ts';
import { SeededRNG } from '../utils/random.ts';
import type { MapNode } from '../types/map.ts';

interface GameStore {
  state: GameState;
  merchantStock: MerchantStock | null;
  removalsThisRun: number;

  // Run management
  newGame: (seed?: number) => void;
  resetToTitle: () => void;
  restoreState: (saved: GameState) => void;
  forfeitRun: () => void;

  // Map navigation
  selectMapNode: (nodeId: string) => void;
  getAvailableMapNodes: () => MapNode[];

  // Encounter actions
  drawFromDeckAction: () => void;
  drawCard: (riverIndex: number) => void;
  discardCard: (handIndex: number) => void;
  reorderHand: (fromIndex: number, toIndex: number) => void;
  finalizeHand: () => void;
  acknowledgeScore: () => void;

  // Post-encounter
  selectCardReward: (cardDefId: string) => void;
  skipCardReward: () => void;

  // Merchant
  merchantBuyCard: (cardDefId: string, price: number) => void;
  merchantBuyRelic: (relicDefId: string, price: number) => void;
  merchantRemoveCard: (instanceId: string) => void;
  leaveMerchant: () => void;

  // Event
  selectEventChoice: (choiceIndex: number) => void;

  // Rest
  leaveRest: () => void;

  // Pending choices
  resolvePendingChoice: (selectedIndices: number[]) => void;

  // Computed
  getLiveScore: () => ReturnType<typeof scoreHand> | null;
  getResolvedHand: () => ResolvedCard[];
}

export const useGameStore = create<GameStore>((set, get) => {
  // Expose store for debugging
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__GAME_STORE = { get };
  }
  return ({
  state: createInitialGameState(),
  merchantStock: null,
  removalsThisRun: 0,

  newGame: (seed) => {
    set({
      state: startRun(seed),
      merchantStock: null,
      removalsThisRun: 0,
    });
  },

  restoreState: (saved) => {
    // Restore the full saved state — including mid-encounter if applicable
    // If the player was in a non-resumable phase, fall back to map
    const nonResumablePhases = new Set(['game_over', 'victory', 'title']);
    const phase = nonResumablePhases.has(saved.phase) ? 'map' : saved.phase;

    // If falling back to map, clear encounter state
    const needsReset = phase === 'map' && saved.phase !== 'map';
    const restored: GameState = needsReset
      ? {
          ...saved,
          phase: 'map',
          encounter: null,
          river: null,
          hand: { cards: [], maxSize: 7 },
          discardPile: [],
          turnsRemaining: 0,
          turnPhase: 'draw',
          riverDiscardCount: 0,
          lastScoreResult: null,
          pendingChoice: null,
          postEncounterReward: null,
          actionLog: [],
        }
      : { ...saved, phase };

    set({
      state: restored,
      merchantStock: null,
      removalsThisRun: 0,
    });
  },

  resetToTitle: () => {
    set({
      state: createInitialGameState(),
      merchantStock: null,
      removalsThisRun: 0,
    });
  },

  forfeitRun: () => {
    const { state: currentState } = get();
    if (!currentState.run) return;
    set({
      state: {
        ...currentState,
        phase: 'game_over',
      },
    });
  },

  selectMapNode: (nodeId) => {
    const { state: currentState } = get();
    if (!currentState.run) return;

    const node = findNode(currentState.run.map, nodeId);
    if (!node) return;

    // Navigate to node
    let newState = navigateToNode(currentState, nodeId);
    newState = {
      ...newState,
      run: {
        ...newState.run!,
        map: markNodeVisited(newState.run!.map, nodeId),
      },
    };

    const rng = new SeededRNG(currentState.run.seed + nodeId.length * 7);

    switch (node.type) {
      case 'encounter': {
        const encounter = generateEncounterForNode(
          currentState.run.encountersCleared,
          currentState.run.map.act,
          rng,
        );
        newState = startEncounter(newState, encounter);
        break;
      }
      case 'boss': {
        const encounter = generateBossEncounter(currentState.run.map.act, rng);
        newState = {
          ...startEncounter(newState, encounter),
          phase: 'boss_intro',
        };
        break;
      }
      case 'merchant': {
        const stock = generateMerchantStock(
          newState.run!.pool,
          newState.relics,
          get().removalsThisRun,
          rng,
        );
        set({ merchantStock: stock });
        newState = { ...newState, phase: 'merchant' };
        break;
      }
      case 'event': {
        newState = { ...newState, phase: 'event' };
        break;
      }
      case 'rest': {
        newState = { ...newState, phase: 'rest' };
        break;
      }
    }

    set({ state: newState });
  },

  getAvailableMapNodes: () => {
    const { state: currentState } = get();
    if (!currentState.run) return [];
    return getAvailableNodes(currentState.run.map, currentState.run.currentNodeId);
  },

  drawFromDeckAction: () => {
    const { state: currentState } = get();
    if (!currentState.river || currentState.turnPhase !== 'draw') return;
    if (currentState.river.deck.length === 0) return;

    try {
      const { river, hand } = drawFromDeck(currentState.river, currentState.hand);
      const drawnCard = hand.cards[hand.cards.length - 1];

      set({
        state: {
          ...currentState,
          river,
          hand,
          turnPhase: 'discard',
          actionLog: [
            ...currentState.actionLog,
            { type: 'draw_from_deck', cardInstanceId: drawnCard.instanceId },
          ],
        },
      });
    } catch {
      // Invalid action, ignore
    }
  },

  drawCard: (riverIndex) => {
    const { state: currentState } = get();
    if (!currentState.river || currentState.turnPhase !== 'draw') return;
    if (currentState.river.cards.length === 0) return;

    try {
      const { river, hand } = drawFromRiver(currentState.river, currentState.hand, riverIndex);
      const drawnCard = hand.cards[hand.cards.length - 1];

      set({
        state: {
          ...currentState,
          river,
          hand,
          turnPhase: 'discard',
          actionLog: [
            ...currentState.actionLog,
            { type: 'draw_from_river', cardInstanceId: drawnCard.instanceId },
          ],
        },
      });
    } catch {
      // Invalid action, ignore
    }
  },

  discardCard: (handIndex) => {
    const { state: currentState } = get();
    if (!currentState.river || currentState.turnPhase !== 'discard') return;
    if (handIndex < 0 || handIndex >= currentState.hand.cards.length) return;

    const card = currentState.hand.cards[handIndex];
    const resolved = resolveCard(card);

    // Discard the card INTO the river (face-up)
    const { river, hand, discardedCard } = discardToRiver(
      currentState.river,
      currentState.hand,
      handIndex,
    );

    const newDiscardCount = currentState.riverDiscardCount + 1;

    // Verify card was actually removed from hand
    if (hand.cards.some(c => c.instanceId === discardedCard.instanceId)) {
      console.error('[BUG] Discarded card still in hand!', discardedCard.instanceId);
      // Force remove it
      hand = {
        ...hand,
        cards: hand.cards.filter(c => c.instanceId !== discardedCard.instanceId),
      };
    }

    let newState: GameState = {
      ...currentState,
      river,
      hand,
      riverDiscardCount: newDiscardCount,
      turnPhase: 'draw', // back to draw phase for next turn
      actionLog: [
        ...currentState.actionLog,
        {
          type: 'discard_to_river',
          cardInstanceId: discardedCard.instanceId,
          effectDescription: resolved.discardEffect?.description ?? 'No effect',
        },
      ],
    };

    // Check if boss stipulation disables discard effects
    const discardDisabled = currentState.encounter?.bossStipulation?.effectId === 'disableDiscard';

    if (resolved.discardEffect && !discardDisabled) {
      const rng = new SeededRNG(
        (currentState.run?.seed ?? 0) + card.instanceId.length,
      );
      newState = executeDiscardEffect(newState, resolved, rng);
    }

    // Auto-end encounter when 10th card is discarded to the river
    if (newDiscardCount >= MAX_RIVER_DISCARDS) {
      const result = scoreHand(newState.hand.cards, newState.relics, newState.encounter?.modifiers);
      newState = {
        ...newState,
        phase: 'scoring',
        lastScoreResult: result,
      };
    }

    set({ state: newState });
  },

  reorderHand: (fromIndex, toIndex) => {
    const { state: currentState } = get();
    const cards = [...currentState.hand.cards];
    if (fromIndex < 0 || fromIndex >= cards.length || toIndex < 0 || toIndex >= cards.length) return;
    if (fromIndex === toIndex) return;
    const [moved] = cards.splice(fromIndex, 1);
    cards.splice(toIndex, 0, moved);
    set({
      state: {
        ...currentState,
        hand: { ...currentState.hand, cards },
      },
    });
  },

  finalizeHand: () => {
    const { state: currentState } = get();
    if (currentState.hand.cards.length === 0) return;

    const result = scoreHand(currentState.hand.cards, currentState.relics, currentState.encounter?.modifiers);

    set({
      state: {
        ...currentState,
        phase: 'scoring',
        lastScoreResult: result,
        turnsRemaining: 0,
      },
    });
  },

  acknowledgeScore: () => {
    const { state: currentState } = get();
    if (!currentState.lastScoreResult || !currentState.encounter || !currentState.run) return;

    const passed = currentState.lastScoreResult.totalScore >= currentState.encounter.scoreThreshold;

    if (passed) {
      const rng = new SeededRNG(currentState.run.seed + currentState.run.encountersCleared * 100);
      const reward = generatePostEncounterReward(
        currentState.run.pool,
        currentState.lastScoreResult.totalScore,
        currentState.encounter.scoreThreshold,
        currentState.encounter.rewardTier,
        currentState.relics,
        rng,
      );

      set({
        state: {
          ...currentState,
          phase: 'post_encounter',
          postEncounterReward: reward,
          run: {
            ...currentState.run,
            totalScore: currentState.run.totalScore + currentState.lastScoreResult.totalScore,
            encountersCleared: currentState.run.encountersCleared + 1,
            gold: currentState.run.gold + reward.gold,
          },
          actionLog: [
            ...currentState.actionLog,
            {
              type: 'encounter_passed',
              score: currentState.lastScoreResult.totalScore,
              threshold: currentState.encounter.scoreThreshold,
            },
          ],
        },
      });
    } else {
      set({
        state: {
          ...currentState,
          phase: 'game_over',
          actionLog: [
            ...currentState.actionLog,
            {
              type: 'encounter_failed',
              score: currentState.lastScoreResult.totalScore,
              threshold: currentState.encounter.scoreThreshold,
            },
          ],
        },
      });
    }
  },

  selectCardReward: (cardDefId) => {
    const { state: currentState } = get();
    if (!currentState.run) return;

    const newPool = addCardToPool(currentState.run.pool, cardDefId);

    set({
      state: {
        ...currentState,
        phase: 'map',
        run: { ...currentState.run, pool: newPool },
        postEncounterReward: null,
        encounter: null,
        river: null,
        hand: { cards: [], maxSize: 7 },
        discardPile: [],
        actionLog: [
          ...currentState.actionLog,
          { type: 'card_added_to_pool', cardDefId },
        ],
      },
    });
  },

  skipCardReward: () => {
    const { state: currentState } = get();
    set({
      state: {
        ...currentState,
        phase: 'map',
        postEncounterReward: null,
        encounter: null,
        river: null,
        hand: { cards: [], maxSize: 7 },
        discardPile: [],
      },
    });
  },

  merchantBuyCard: (cardDefId, price) => {
    const { state: currentState } = get();
    if (!currentState.run) return;

    const result = buyCard(currentState.run.pool, currentState.run.gold, cardDefId, price);
    if (!result) return;

    set({
      state: {
        ...currentState,
        run: { ...currentState.run, pool: result.pool, gold: result.gold },
      },
    });
  },

  merchantBuyRelic: (relicDefId, price) => {
    const { state: currentState } = get();
    if (!currentState.run) return;

    const result = buyRelic(currentState.relics, currentState.run.gold, relicDefId, price);
    if (!result) return;

    set({
      state: {
        ...currentState,
        relics: result.relics,
        run: { ...currentState.run, gold: result.gold },
      },
    });
  },

  merchantRemoveCard: (instanceId) => {
    const { state: currentState, merchantStock, removalsThisRun } = get();
    if (!currentState.run || !merchantStock) return;

    const result = removeCardFromPool(
      currentState.run.pool,
      currentState.run.gold,
      instanceId,
      merchantStock.removalCost,
    );
    if (!result) return;

    set({
      state: {
        ...currentState,
        run: { ...currentState.run, pool: result.pool, gold: result.gold },
      },
      removalsThisRun: removalsThisRun + 1,
    });
  },

  leaveMerchant: () => {
    set(({ state }) => ({
      state: { ...state, phase: 'map' },
      merchantStock: null,
    }));
  },

  selectEventChoice: (_choiceIndex) => {
    // Events will be handled once event data is ready
    const { state: currentState } = get();
    set({
      state: { ...currentState, phase: 'map' },
    });
  },

  leaveRest: () => {
    set(({ state }) => ({
      state: { ...state, phase: 'map' },
    }));
  },

  resolvePendingChoice: (selectedIndices) => {
    const { state: currentState } = get();
    if (!currentState.pendingChoice) return;

    const { pendingChoice } = currentState;

    // Handle different pending choice types
    if (pendingChoice.type === 'choose_from_discard') {
      const selected = selectedIndices.map(i => (pendingChoice.options as import('../types/card.ts').CardInstance[])[i]);
      const remaining = (pendingChoice.options as import('../types/card.ts').CardInstance[]).filter((_, i) => !selectedIndices.includes(i));

      set({
        state: {
          ...currentState,
          hand: {
            ...currentState.hand,
            cards: [...currentState.hand.cards, ...selected].slice(0, currentState.hand.maxSize),
          },
          discardPile: remaining,
          pendingChoice: null,
        },
      });
    } else if (pendingChoice.type === 'choose_from_river') {
      const selected = selectedIndices.map(i => (pendingChoice.options as import('../types/card.ts').CardInstance[])[i]);
      const remaining = (pendingChoice.options as import('../types/card.ts').CardInstance[]).filter((_, i) => !selectedIndices.includes(i));

      if (currentState.river) {
        set({
          state: {
            ...currentState,
            river: {
              ...currentState.river,
              cards: [...currentState.river.cards, ...selected],
              deck: [...remaining, ...currentState.river.deck.slice(selected.length + remaining.length)],
            },
            pendingChoice: null,
          },
        });
      }
    } else {
      // Clear pending choice for unhandled types
      set({
        state: { ...currentState, pendingChoice: null },
      });
    }
  },

  getLiveScore: () => {
    const { state: currentState } = get();
    if (currentState.hand.cards.length === 0) return null;

    // Check if boss stipulation hides score preview
    if (currentState.encounter?.bossStipulation?.effectId === 'hideScorePreview') {
      return null;
    }

    return scoreHand(currentState.hand.cards, currentState.relics, currentState.encounter?.modifiers);
  },

  getResolvedHand: () => {
    const { state: currentState } = get();
    return currentState.hand.cards.map(resolveCard);
  },
})});
