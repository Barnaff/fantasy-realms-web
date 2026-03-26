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
