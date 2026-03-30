import type { CardInstance, ResolvedCard, Tag } from '../types/card.ts';
import type { GameState } from '../types/game.ts';
import { resolveCard } from './scoring.ts';
import { addToRiver, removeFromRiver } from './river.ts';
import { SeededRNG } from '../utils/random.ts';

type DiscardEffectFn = (
  state: GameState,
  card: ResolvedCard,
  params: Record<string, unknown>,
  rng: SeededRNG,
) => GameState;

const discardRegistry: Record<string, DiscardEffectFn> = {
  phoenixOnDiscard: (state, card, _params, _rng) => {
    if (!state.run) return state;
    const bonusAmount = 3;

    // Find the Phoenix in the pool and add a permanent baseValue modifier
    const newPool = state.run.pool.map(inst => {
      if (inst.defId === card.defId) {
        return {
          ...inst,
          modifiers: [...inst.modifiers, { type: 'changeBaseValue' as const, payload: bonusAmount }],
        };
      }
      return inst;
    });

    // Find the Phoenix card that was just discarded (now in river) and exhaust it
    // The discarded card was already moved to river.cards by GameManager before this runs
    const discardedInRiver = state.river?.cards.find(c => c.defId === card.defId);
    const newRiverCards = state.river ? state.river.cards.filter(c => c !== discardedInRiver) : [];
    const exhausted = discardedInRiver
      ? [...state.exhaustedCards, discardedInRiver]
      : state.exhaustedCards;

    return {
      ...state,
      run: { ...state.run, pool: newPool },
      river: state.river ? { ...state.river, cards: newRiverCards } : null,
      exhaustedCards: exhausted,
      actionLog: [
        ...state.actionLog,
        ...(discardedInRiver
          ? [{ type: 'exhaust' as const, cardInstanceId: discardedInRiver.instanceId, cardName: card.name }]
          : []),
      ],
    };
  },

  removeFromRiver: (state, _card, params, rng) => {
    if (!state.river) return state;
    const count = params.count as number;
    const available = state.river.cards.length;
    if (available === 0) return state;

    // Remove random cards from river
    const toRemove = Math.min(count, available);
    const indices = rng.pick(
      Array.from({ length: available }, (_, i) => i),
      toRemove,
    );
    const { river, discardPile } = removeFromRiver(state.river, indices, state.discardPile);

    return { ...state, river, discardPile };
  },

  addToRiver: (state, _card, params, _rng) => {
    if (!state.river) return state;
    const count = params.count as number;
    const river = addToRiver(state.river, count);
    return { ...state, river };
  },

  peekAndChoose: (state, _card, params, _rng) => {
    if (!state.river) return state;
    const peekCount = params.peekCount as number;
    const keepCount = params.keepCount as number;

    const peeked = state.river.deck.slice(0, peekCount);
    if (peeked.length === 0) return state;

    // Set up a pending choice for the player to pick which to keep
    return {
      ...state,
      pendingChoice: {
        type: 'choose_from_river',
        options: peeked,
        minSelections: Math.min(keepCount, peeked.length),
        maxSelections: Math.min(keepCount, peeked.length),
        prompt: `Choose ${keepCount} card(s) to add to the river`,
      },
    };
  },

  reshuffleRiver: (state, _card, _params, rng) => {
    if (!state.river) return state;

    const allCards = [...state.river.cards, ...state.river.deck];
    rng.shuffle(allCards);

    const riverSize = state.encounter?.riverSize ?? state.river.cards.length;
    const newRiverCards = allCards.slice(0, riverSize);
    const newDeck = allCards.slice(riverSize);

    return {
      ...state,
      river: { cards: newRiverCards, deck: newDeck },
    };
  },

  retrieveFromDiscard: (state, _card, params, _rng) => {
    const count = params.count as number;
    if (state.discardPile.length === 0) return state;

    return {
      ...state,
      pendingChoice: {
        type: 'choose_from_discard',
        options: state.discardPile,
        minSelections: Math.min(count, state.discardPile.length),
        maxSelections: Math.min(count, state.discardPile.length),
        prompt: `Choose ${count} card(s) to retrieve from the discard pile`,
      },
    };
  },

  transformRiverCard: (state, _card, _params, _rng) => {
    if (!state.river || state.river.cards.length === 0) return state;

    return {
      ...state,
      pendingChoice: {
        type: 'choose_from_river',
        options: state.river.cards,
        minSelections: 1,
        maxSelections: 1,
        prompt: 'Choose a river card to transform its tags',
      },
    };
  },

  addTaggedFromDeck: (state, _card, params, _rng) => {
    if (!state.river) return state;
    const tags = params.tags as Tag[];
    const countEach = params.countEach as number;

    let newDeck = [...state.river.deck];
    const toAdd: CardInstance[] = [];

    for (const tag of tags) {
      let found = 0;
      for (let i = 0; i < newDeck.length && found < countEach; i++) {
        const resolved = resolveCard(newDeck[i]);
        if (resolved.tags.includes(tag)) {
          toAdd.push(newDeck[i]);
          newDeck = [...newDeck.slice(0, i), ...newDeck.slice(i + 1)];
          found++;
          i--; // adjust index after removal
        }
      }
    }

    return {
      ...state,
      river: {
        cards: [...state.river.cards, ...toAdd],
        deck: newDeck,
      },
    };
  },

  removeFromRiverByCondition: (state, _card, params, _rng) => {
    if (!state.river) return state;
    const condition = params.condition as string;
    const threshold = params.threshold as number;

    const indicesToRemove: number[] = [];

    for (let i = 0; i < state.river.cards.length; i++) {
      const resolved = resolveCard(state.river.cards[i]);
      if (condition === 'baseValueLessThan' && resolved.baseValue < threshold) {
        indicesToRemove.push(i);
      }
    }

    if (indicesToRemove.length === 0) return state;

    const { river, discardPile } = removeFromRiver(state.river, indicesToRemove, state.discardPile);
    return { ...state, river, discardPile };
  },

  lichLordOnDiscard: (state, _card, _params, _rng) => {
    if (!state.river) return state;

    // Find the first Leader in river.cards
    let leaderIdx = -1;
    let leaderName = '';
    for (let i = 0; i < state.river.cards.length; i++) {
      const resolved = resolveCard(state.river.cards[i]);
      if (resolved.tags.includes('Leader' as Tag)) {
        leaderIdx = i;
        leaderName = resolved.name;
        break;
      }
    }

    if (leaderIdx === -1) return state; // No Leader in river — nothing happens

    // Exhaust the Leader (remove from river, add to exhaustedCards)
    const exhaustedCard = state.river.cards[leaderIdx];
    const newRiverCards = [...state.river.cards];
    newRiverCards.splice(leaderIdx, 1);

    // Find first Undead in deck and move to river
    let newDeck = [...state.river.deck];
    const undeadDeckIdx = newDeck.findIndex(c => {
      const r = resolveCard(c);
      return r.tags.includes('Undead' as Tag);
    });

    let addedCards: CardInstance[] = [];
    if (undeadDeckIdx !== -1) {
      addedCards = [newDeck[undeadDeckIdx]];
      newDeck = [...newDeck.slice(0, undeadDeckIdx), ...newDeck.slice(undeadDeckIdx + 1)];
    }

    return {
      ...state,
      river: { cards: [...newRiverCards, ...addedCards], deck: newDeck },
      exhaustedCards: [...state.exhaustedCards, exhaustedCard],
      actionLog: [
        ...state.actionLog,
        { type: 'exhaust' as const, cardInstanceId: exhaustedCard.instanceId, cardName: leaderName },
      ],
    };
  },

  exhaustOnDiscard: (state, card, _params, _rng) => {
    if (!state.river) return state;
    // Find the card in river (it was just discarded there)
    const idx = state.river.cards.findIndex(c => c.defId === card.defId);
    if (idx < 0) return state;
    const exhausted = state.river.cards[idx];
    const newRiverCards = [...state.river.cards];
    newRiverCards.splice(idx, 1);
    return {
      ...state,
      river: { cards: newRiverCards, deck: state.river.deck },
      exhaustedCards: [...state.exhaustedCards, exhausted],
      actionLog: [
        ...state.actionLog,
        { type: 'exhaust' as const, cardInstanceId: exhausted.instanceId, cardName: card.name },
      ],
    };
  },

  hedgeWitchOnDiscard: (state, card, _params, _rng) => {
    // If rival has cards, show a selection popup; otherwise just exhaust
    if (state.rivalHand.length === 0) {
      // No rival cards to reveal — just exhaust Hedge Witch
      const hwInRiver = state.river?.cards.find(c => c.defId === card.defId);
      if (!hwInRiver) return state;
      return {
        ...state,
        river: { cards: state.river!.cards.filter(c => c.instanceId !== hwInRiver.instanceId), deck: state.river!.deck },
        exhaustedCards: [...state.exhaustedCards, hwInRiver],
        actionLog: [
          ...state.actionLog,
          { type: 'exhaust' as const, cardInstanceId: hwInRiver.instanceId, cardName: card.name },
        ],
      };
    }

    // Set pending choice — player picks a rival card to discard to river
    return {
      ...state,
      pendingChoice: {
        type: 'pick_from_rival_hand' as const,
        options: state.rivalHand.map(c => c.instanceId),
        minSelections: 1,
        maxSelections: 1,
        prompt: 'Choose a card from the rival\'s hand to discard to the river',
        sourceCardName: card.name,
        sourceCardId: card.defId,
      },
    };
  },

  drawTaggedFromRiver: (state, _card, params, _rng) => {
    if (!state.river) return state;
    const tag = params.tag as Tag;
    const count = params.count as number;

    const matching: number[] = [];
    for (let i = 0; i < state.river.cards.length && matching.length < count; i++) {
      const resolved = resolveCard(state.river.cards[i]);
      if (resolved.tags.includes(tag)) {
        matching.push(i);
      }
    }

    if (matching.length === 0) return state;

    const drawnCards: CardInstance[] = [];
    const newRiverCards = [...state.river.cards];

    // Remove from highest index first to maintain indices
    for (const idx of [...matching].sort((a, b) => b - a)) {
      drawnCards.push(...newRiverCards.splice(idx, 1));
    }

    const maxHand = state.hand.maxSize;
    const spaceInHand = maxHand - state.hand.cards.length;
    const toHand = drawnCards.slice(0, spaceInHand);
    const toDiscard = drawnCards.slice(spaceInHand);

    return {
      ...state,
      river: { ...state.river, cards: newRiverCards },
      hand: { ...state.hand, cards: [...state.hand.cards, ...toHand] },
      discardPile: [...state.discardPile, ...toDiscard],
    };
  },
};

export function executeDiscardEffect(
  state: GameState,
  card: ResolvedCard,
  rng: SeededRNG,
): GameState {
  if (!card.discardEffect) return state;

  const fn = discardRegistry[card.discardEffect.effectId];
  if (!fn) {
    console.warn(`Unknown discard effect: ${card.discardEffect.effectId}`);
    return state;
  }

  return fn(state, card, card.discardEffect.params, rng);
}
