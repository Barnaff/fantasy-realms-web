import Phaser from 'phaser';
import type { GameState } from '../../types/game.ts';
import type { ResolvedCard } from '../../types/card.ts';
import type { MapNode } from '../../types/map.ts';
import { createInitialGameState, startRun, startEncounter } from '../../engine/run.ts';
import { drawFromRiver, drawFromDeck, discardToRiver } from '../../engine/river.ts';
import { MAX_RIVER_DISCARDS } from '../../types/game.ts';
import { scoreHand, resolveCard } from '../../engine/scoring.ts';
import { executeDiscardEffect } from '../../engine/effects.ts';
import { addCardToPool, generatePostEncounterReward } from '../../engine/pool.ts';
import { generateMerchantStock, buyCard, buyRelic, removeCardFromPool, type MerchantStock } from '../../engine/merchant.ts';
import { getAvailableNodes, markNodeVisited, findNode } from '../../engine/map.ts';
import { generateEncounterForNode, generateBossEncounter } from '../../engine/encounters.ts';
import { SeededRNG } from '../../utils/random.ts';
import { EVENT_DEFS } from '../../data/events.ts';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/config.ts';
import type { RunRecord, LevelRecord, RewardRecord } from '../../types/analytics.ts';

/**
 * Singleton that manages all game state — Phaser replacement for useGameStore.
 * Emits events so scenes can react to state changes.
 */
export class GameManager {
  private static _instance: GameManager;

  state: GameState;
  merchantStock: MerchantStock | null = null;
  removalsThisRun = 0;
  events: Phaser.Events.EventEmitter;
  currentRunRecord: Partial<RunRecord> = {};

  private constructor() {
    this.state = createInitialGameState();
    this.events = new Phaser.Events.EventEmitter();
  }

  static getInstance(): GameManager {
    if (!GameManager._instance) {
      GameManager._instance = new GameManager();
    }
    return GameManager._instance;
  }

  private emit(event: string) {
    this.events.emit(event, this.state);
  }

  // ── Run management ──

  newGame(seed?: number) {
    this.state = startRun(seed);
    this.merchantStock = null;
    this.removalsThisRun = 0;

    // Initialize analytics run record
    this.currentRunRecord = {
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      odUserId: '',
      startedAt: new Date().toISOString(),
      seed: this.state.run?.seed ?? 0,
      levels: [],
      rewards: [],
      draftPickedCardIds: [],
      levelsCompleted: 0,
      totalScore: 0,
      won: false,
    };

    this.emit('stateChanged');
    this.emit('phaseChanged');
  }

  selectDraftOption(optionId: string) {
    if (!this.state.run || !this.state.draftOptions) return;
    const option = this.state.draftOptions.find(o => o.id === optionId);
    if (!option) return;

    // Track draft picks for analytics
    if (this.currentRunRecord.draftPickedCardIds) {
      this.currentRunRecord.draftPickedCardIds.push(...option.cardIds);
    }

    // Add the 3 cards to pool
    let pool = this.state.run.pool;
    for (const cardId of option.cardIds) {
      pool = addCardToPool(pool, cardId);
    }

    this.state = {
      ...this.state,
      phase: 'map',
      run: { ...this.state.run, pool },
      draftOptions: null,
    };
    this.emit('stateChanged');
    this.emit('phaseChanged');
  }

  /**
   * Save a completed run record with a specific won flag.
   * Called from GameOverScene after determining victory status.
   */
  saveCompletedRun(won: boolean) {
    if (this.currentRunRecord.id && !this.currentRunRecord.endedAt) {
      this.saveRunRecord(won);
    }
  }

  resetToTitle() {
    this.currentRunRecord = {};
    this.state = createInitialGameState();
    this.merchantStock = null;
    this.removalsThisRun = 0;
    this.emit('stateChanged');
    this.emit('phaseChanged');
  }

  restoreState(saved: GameState) {
    this.state = saved;
    this.emit('stateChanged');
    this.emit('phaseChanged');
  }

  forfeitRun() {
    this.state = { ...this.state, phase: 'game_over' };
    this.emit('stateChanged');
    this.emit('phaseChanged');
  }

  private async saveRunRecord(won: boolean) {
    try {
      this.currentRunRecord.endedAt = new Date().toISOString();
      const record: RunRecord = {
        id: this.currentRunRecord.id ?? `run_${Date.now()}`,
        odUserId: this.currentRunRecord.odUserId ?? '',
        startedAt: this.currentRunRecord.startedAt ?? new Date().toISOString(),
        endedAt: this.currentRunRecord.endedAt,
        seed: this.currentRunRecord.seed ?? 0,
        won,
        levelsCompleted: this.state.run?.encountersCleared ?? 0,
        totalScore: this.state.run?.totalScore ?? 0,
        finalPoolSize: this.state.run?.pool.length ?? 0,
        levels: this.currentRunRecord.levels ?? [],
        rewards: this.currentRunRecord.rewards ?? [],
        draftPickedCardIds: this.currentRunRecord.draftPickedCardIds ?? [],
      };
      await addDoc(collection(db, 'runRecords'), record);
    } catch (err) {
      console.error('Failed to save run record:', err);
    }
  }

  // ── Map navigation ──

  getAvailableMapNodes(): MapNode[] {
    if (!this.state.run?.map) return [];
    return getAvailableNodes(this.state.run.map, this.state.run.currentNodeId);
  }

  selectMapNode(nodeId: string) {
    if (!this.state.run?.map) return;
    const node = findNode(this.state.run.map, nodeId);
    if (!node) return;

    const rng = new SeededRNG(this.state.run.seed + nodeId.length);

    let newState: GameState = {
      ...this.state,
      run: {
        ...this.state.run,
        currentNodeId: nodeId,
        map: markNodeVisited(this.state.run.map, nodeId),
      },
    };

    switch (node.type) {
      case 'encounter': {
        const enc = generateEncounterForNode(
          node.encounterData?.encounterId ? parseInt(node.encounterData.encounterId.split('_').pop() ?? '0', 10) : 0,
          this.state.run.map.act,
          rng,
        );
        newState = startEncounter(newState, enc);
        newState = { ...newState, phase: 'player_turn' };
        break;
      }
      case 'boss': {
        const enc = generateBossEncounter(this.state.run.map.act, rng);
        newState = startEncounter(newState, enc);
        newState = { ...newState, phase: 'boss_intro' };
        break;
      }
      case 'merchant': {
        this.merchantStock = generateMerchantStock(
          newState.run!.pool,
          newState.relics,
          this.removalsThisRun,
          rng,
        );
        newState = { ...newState, phase: 'merchant' };
        break;
      }
      case 'event': {
        const eventId = node.eventData ?? EVENT_DEFS[rng.nextInt(0, EVENT_DEFS.length - 1)].id;
        newState = {
          ...newState,
          phase: 'event',
          pendingChoice: {
            type: 'choose_event_option',
            options: [eventId],
            minSelections: 1,
            maxSelections: 1,
            prompt: `Event: ${eventId}`,
          },
        };
        break;
      }
      case 'rest': {
        newState = { ...newState, phase: 'rest' };
        break;
      }
    }

    this.state = newState;
    this.emit('stateChanged');
    this.emit('phaseChanged');
  }

  // ── Encounter actions ──

  drawFromDeckAction() {
    if (this.state.phase !== 'player_turn' || this.state.turnPhase !== 'draw') return;
    if (!this.state.river || this.state.river.deck.length === 0) return;

    const { river, hand } = drawFromDeck(this.state.river, this.state.hand);
    this.state = {
      ...this.state,
      river,
      hand,
      turnPhase: 'discard',
    };
    this.emit('stateChanged');
    this.emit('handChanged');
  }

  drawCard(riverIndex: number) {
    if (this.state.phase !== 'player_turn' || this.state.turnPhase !== 'draw') return;
    if (!this.state.river || riverIndex >= this.state.river.cards.length) return;

    const { river, hand } = drawFromRiver(this.state.river, this.state.hand, riverIndex);
    this.state = {
      ...this.state,
      river,
      hand,
      turnPhase: 'discard',
    };
    this.emit('stateChanged');
    this.emit('handChanged');
  }

  discardCard(handIndex: number) {
    if (this.state.phase !== 'player_turn' || this.state.turnPhase !== 'discard') return;
    if (!this.state.river || handIndex >= this.state.hand.cards.length) return;

    const discardedCard = this.state.hand.cards[handIndex];
    const resolved = resolveCard(discardedCard);
    const { river, hand } = discardToRiver(this.state.river, this.state.hand, handIndex);
    const newDiscardCount = this.state.riverDiscardCount + 1;

    let newState: GameState = {
      ...this.state,
      river,
      hand,
      riverDiscardCount: newDiscardCount,
      turnPhase: 'draw',
    };

    // Execute discard effect if any
    if (resolved.discardEffect) {
      const rng = new SeededRNG(this.state.run!.seed + newDiscardCount);
      newState = executeDiscardEffect(newState, resolved, rng);
    }

    // Auto-end encounter when 10th card is discarded
    if (newDiscardCount >= MAX_RIVER_DISCARDS) {
      const result = scoreHand(newState.hand.cards, newState.relics, newState.encounter?.modifiers);
      newState = {
        ...newState,
        phase: 'scoring',
        lastScoreResult: result,
      };
    }

    this.state = newState;
    this.emit('stateChanged');
    this.emit('handChanged');
    if (newState.phase === 'scoring') this.emit('phaseChanged');
  }

  reorderHand(fromIndex: number, toIndex: number) {
    const cards = [...this.state.hand.cards];
    if (fromIndex < 0 || fromIndex >= cards.length || toIndex < 0 || toIndex >= cards.length) return;
    if (fromIndex === toIndex) return;
    const [moved] = cards.splice(fromIndex, 1);
    cards.splice(toIndex, 0, moved);
    this.state = {
      ...this.state,
      hand: { ...this.state.hand, cards },
    };
    this.emit('handChanged');
  }

  finalizeHand() {
    if (this.state.hand.cards.length === 0) return;
    const result = scoreHand(this.state.hand.cards, this.state.relics, this.state.encounter?.modifiers);
    this.state = {
      ...this.state,
      phase: 'scoring',
      lastScoreResult: result,
    };
    this.emit('stateChanged');
    this.emit('phaseChanged');
  }

  acknowledgeScore() {
    if (!this.state.lastScoreResult || !this.state.encounter) return;
    const passed = this.state.lastScoreResult.totalScore >= this.state.encounter.scoreThreshold;

    // Track level record for analytics
    const levelRecord: LevelRecord = {
      levelIndex: this.state.run?.encountersCleared ?? 0,
      encounterName: this.state.encounter.name,
      targetScore: this.state.encounter.scoreThreshold,
      actualScore: this.state.lastScoreResult.totalScore,
      passed,
      handCardIds: this.state.hand.cards.map(c => c.defId),
      handScore: this.state.lastScoreResult.totalScore,
      modifiers: this.state.encounter.modifiers?.map(m => ({ tag: m.tag, value: m.value })),
    };
    if (this.currentRunRecord.levels) {
      this.currentRunRecord.levels.push(levelRecord);
    }

    if (passed) {
      const rng = new SeededRNG(this.state.run!.seed + this.state.run!.encountersCleared);
      const reward = generatePostEncounterReward(
        this.state.run!.pool,
        this.state.lastScoreResult.totalScore,
        this.state.encounter.scoreThreshold,
        this.state.encounter.rewardTier,
        this.state.relics,
        rng,
        this.state.run!.skippedCardCounts,
      );
      const goldEarned = 10 + Math.floor(this.state.lastScoreResult.totalScore / 10);

      this.state = {
        ...this.state,
        phase: 'post_encounter',
        postEncounterReward: reward,
        run: {
          ...this.state.run!,
          gold: this.state.run!.gold + goldEarned,
          totalScore: this.state.run!.totalScore + this.state.lastScoreResult.totalScore,
          encountersCleared: this.state.run!.encountersCleared + 1,
        },
      };
    } else {
      this.state = { ...this.state, phase: 'game_over' };
    }

    this.emit('stateChanged');
    this.emit('phaseChanged');
  }

  // ── Post-encounter ──

  selectCardReward(cardDefIdOrIndex: string | number) {
    if (!this.state.run) return;

    // Track reward selection for analytics
    {
      const analyticsOptions = this.state.postEncounterReward?.cardChoices ?? [];
      const selectedIdx = typeof cardDefIdOrIndex === 'number' ? cardDefIdOrIndex : -1;
      const selectedCards = selectedIdx >= 0 && analyticsOptions[selectedIdx]
        ? analyticsOptions[selectedIdx].cards
        : (typeof cardDefIdOrIndex === 'string' ? [cardDefIdOrIndex] : []);
      const rewardRecord: RewardRecord = {
        levelIndex: this.state.run.encountersCleared - 1,
        offeredOptions: analyticsOptions.map(o => o.cards),
        selectedOptionIndex: selectedIdx,
        selectedCardIds: selectedCards,
      };
      if (this.currentRunRecord.rewards) {
        this.currentRunRecord.rewards.push(rewardRecord);
      }
    }

    let pool = this.state.run.pool;
    const skipped = { ...this.state.run.skippedCardCounts };
    const selectedIndex = typeof cardDefIdOrIndex === 'number' ? cardDefIdOrIndex : -1;

    if (typeof cardDefIdOrIndex === 'number') {
      const option = this.state.postEncounterReward?.cardChoices[cardDefIdOrIndex];
      if (option) {
        for (const defId of option.cards) {
          pool = addCardToPool(pool, defId);
        }
      }
    } else {
      pool = addCardToPool(pool, cardDefIdOrIndex);
    }

    // Record skipped cards: all cards from NON-selected options
    const allOptions = this.state.postEncounterReward?.cardChoices ?? [];
    for (let i = 0; i < allOptions.length; i++) {
      if (i === selectedIndex) continue; // don't count selected option
      for (const defId of allOptions[i].cards) {
        skipped[defId] = (skipped[defId] || 0) + 1;
      }
    }

    this.state = {
      ...this.state,
      phase: 'map',
      run: { ...this.state.run, pool, skippedCardCounts: skipped },
      postEncounterReward: null,
    };
    this.emit('stateChanged');
    this.emit('phaseChanged');
  }

  skipCardReward() {
    if (!this.state.run) {
      this.state = { ...this.state, phase: 'map', postEncounterReward: null };
      this.emit('stateChanged');
      this.emit('phaseChanged');
      return;
    }

    // Track skipped reward for analytics
    {
      const analyticsOptions = this.state.postEncounterReward?.cardChoices ?? [];
      const rewardRecord: RewardRecord = {
        levelIndex: this.state.run.encountersCleared - 1,
        offeredOptions: analyticsOptions.map(o => o.cards),
        selectedOptionIndex: -1,
        selectedCardIds: [],
      };
      if (this.currentRunRecord.rewards) {
        this.currentRunRecord.rewards.push(rewardRecord);
      }
    }

    // All offered cards are skipped
    const skipped = { ...this.state.run.skippedCardCounts };
    const allOptions = this.state.postEncounterReward?.cardChoices ?? [];
    for (const option of allOptions) {
      for (const defId of option.cards) {
        skipped[defId] = (skipped[defId] || 0) + 1;
      }
    }

    this.state = {
      ...this.state,
      phase: 'map',
      run: { ...this.state.run, skippedCardCounts: skipped },
      postEncounterReward: null,
    };
    this.emit('stateChanged');
    this.emit('phaseChanged');
  }

  // ── Merchant ──

  merchantBuyCard(cardDefId: string, price: number) {
    if (!this.state.run || !this.merchantStock) return;
    const result = buyCard(this.state.run.pool, this.state.run.gold, cardDefId, price);
    if (!result) return;
    this.state = {
      ...this.state,
      run: { ...this.state.run, pool: result.pool, gold: result.gold },
    };
    this.merchantStock = {
      ...this.merchantStock,
      cards: this.merchantStock.cards.filter(c => c.defId !== cardDefId),
    };
    this.emit('stateChanged');
  }

  merchantBuyRelic(relicDefId: string, price: number) {
    if (!this.state.run || !this.merchantStock) return;
    const result = buyRelic(this.state.relics, this.state.run.gold, relicDefId, price);
    if (!result) return;
    this.state = {
      ...this.state,
      relics: result.relics,
      run: { ...this.state.run, gold: result.gold },
    };
    this.merchantStock = {
      ...this.merchantStock,
      relics: this.merchantStock.relics.filter(r => r.defId !== relicDefId),
    };
    this.emit('stateChanged');
  }

  merchantRemoveCard(instanceId: string) {
    if (!this.state.run || !this.merchantStock) return;
    const result = removeCardFromPool(this.state.run.pool, this.state.run.gold, instanceId, this.merchantStock.removalCost);
    if (!result) return;
    this.removalsThisRun++;
    this.state = {
      ...this.state,
      run: {
        ...this.state.run,
        pool: result.pool,
        gold: result.gold,
      },
    };
    this.emit('stateChanged');
  }

  leaveMerchant() {
    this.merchantStock = null;
    this.state = { ...this.state, phase: 'map' };
    this.emit('stateChanged');
    this.emit('phaseChanged');
  }

  // ── Event ──

  selectEventChoice(choiceIndex: number) {
    if (!this.state.pendingChoice || this.state.pendingChoice.type !== 'choose_event_option') return;
    const eventId = this.state.pendingChoice.options[0] as string;
    const eventDef = EVENT_DEFS.find(e => e.id === eventId);
    if (!eventDef || choiceIndex >= eventDef.choices.length) return;

    // Apply choice effect (simplified — full implementation in engine)
    this.state = {
      ...this.state,
      phase: 'map',
      pendingChoice: null,
    };
    this.emit('stateChanged');
    this.emit('phaseChanged');
  }

  // ── Rest ──

  leaveRest() {
    this.state = { ...this.state, phase: 'map' };
    this.emit('stateChanged');
    this.emit('phaseChanged');
  }

  // ── Computed ──

  getLiveScore() {
    if (this.state.hand.cards.length === 0) return null;
    return scoreHand(this.state.hand.cards, this.state.relics, this.state.encounter?.modifiers);
  }

  getResolvedHand(): ResolvedCard[] {
    return this.state.hand.cards.map(resolveCard);
  }
}
