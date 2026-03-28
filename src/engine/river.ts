import type { CardInstance } from '../types/card.ts';
import type { River, HandState } from '../types/game.ts';

/**
 * Create the river + deck for an encounter.
 * The river starts EMPTY — initial hand is dealt separately.
 */
export function createRiver(deck: CardInstance[]): River {
  return { cards: [], deck: [...deck] };
}

/**
 * Deal the initial hand from the deck (top N cards),
 * then place 2 cards face-up in the river.
 * Returns the updated river and the dealt hand.
 */
export function dealInitialHand(
  river: River,
  handSize: number,
  initialRiverCards: number = 1,
): { river: River; hand: HandState } {
  const dealt = river.deck.slice(0, handSize);
  const afterHand = river.deck.slice(handSize);

  // Place initial cards face-up in the river
  const riverCards = afterHand.slice(0, initialRiverCards);
  const remaining = afterHand.slice(initialRiverCards);

  return {
    river: { ...river, cards: riverCards, deck: remaining },
    hand: { cards: dealt, maxSize: handSize },
  };
}

/**
 * Draw the top card from the deck into the player's hand.
 */
export function drawFromDeck(
  river: River,
  hand: HandState,
): { river: River; hand: HandState } {
  if (river.deck.length === 0) {
    throw new Error('Deck is empty, cannot draw');
  }
  const [topCard, ...remaining] = river.deck;
  return {
    river: { ...river, deck: remaining },
    hand: { ...hand, cards: [...hand.cards, topCard] },
  };
}

/**
 * Discard a card from hand INTO the river (face-up).
 */
export function discardToRiver(
  river: River,
  hand: HandState,
  handIndex: number,
): { river: River; hand: HandState; discardedCard: CardInstance } {
  if (handIndex < 0 || handIndex >= hand.cards.length) {
    throw new Error(`Invalid hand index: ${handIndex}`);
  }
  const discardedCard = hand.cards[handIndex];
  const newHandCards = [
    ...hand.cards.slice(0, handIndex),
    ...hand.cards.slice(handIndex + 1),
  ];
  return {
    river: { ...river, cards: [...river.cards, discardedCard] },
    hand: { ...hand, cards: newHandCards },
    discardedCard,
  };
}

export function drawFromRiver(
  river: River,
  hand: HandState,
  riverIndex: number,
): { river: River; hand: HandState } {
  if (riverIndex < 0 || riverIndex >= river.cards.length) {
    throw new Error(`Invalid river index: ${riverIndex}`);
  }

  const drawnCard = river.cards[riverIndex];
  const newRiverCards = [
    ...river.cards.slice(0, riverIndex),
    ...river.cards.slice(riverIndex + 1),
  ];

  return {
    river: { ...river, cards: newRiverCards },
    hand: {
      ...hand,
      cards: [...hand.cards, drawnCard],
    },
  };
}

export function swapWithRiver(
  river: River,
  hand: HandState,
  handIndex: number,
  riverIndex: number,
): { river: River; hand: HandState } {
  if (handIndex < 0 || handIndex >= hand.cards.length) {
    throw new Error(`Invalid hand index: ${handIndex}`);
  }
  if (riverIndex < 0 || riverIndex >= river.cards.length) {
    throw new Error(`Invalid river index: ${riverIndex}`);
  }

  const cardFromHand = hand.cards[handIndex];
  const cardFromRiver = river.cards[riverIndex];

  const newHandCards = [...hand.cards];
  newHandCards[handIndex] = cardFromRiver;

  const newRiverCards = [...river.cards];
  newRiverCards[riverIndex] = cardFromHand;

  return {
    river: { ...river, cards: newRiverCards },
    hand: { ...hand, cards: newHandCards },
  };
}

export function discardFromHand(
  hand: HandState,
  handIndex: number,
  discardPile: CardInstance[],
): { hand: HandState; discardPile: CardInstance[] } {
  if (handIndex < 0 || handIndex >= hand.cards.length) {
    throw new Error(`Invalid hand index: ${handIndex}`);
  }

  const discardedCard = hand.cards[handIndex];
  const newHandCards = [
    ...hand.cards.slice(0, handIndex),
    ...hand.cards.slice(handIndex + 1),
  ];

  return {
    hand: { ...hand, cards: newHandCards },
    discardPile: [...discardPile, discardedCard],
  };
}

export function refillRiver(river: River, targetSize: number): River {
  if (river.cards.length >= targetSize || river.deck.length === 0) {
    return river;
  }

  const needed = Math.min(targetSize - river.cards.length, river.deck.length);
  const newCards = river.deck.slice(0, needed);
  const remainingDeck = river.deck.slice(needed);

  return {
    cards: [...river.cards, ...newCards],
    deck: remainingDeck,
  };
}

export function removeFromRiver(
  river: River,
  indices: number[],
  discardPile: CardInstance[],
): { river: River; discardPile: CardInstance[] } {
  const sortedIndices = [...indices].sort((a, b) => b - a);
  const removed: CardInstance[] = [];
  const newCards = [...river.cards];

  for (const idx of sortedIndices) {
    if (idx >= 0 && idx < newCards.length) {
      removed.push(...newCards.splice(idx, 1));
    }
  }

  return {
    river: { ...river, cards: newCards },
    discardPile: [...discardPile, ...removed],
  };
}

export function addToRiver(river: River, count: number): River {
  const toAdd = Math.min(count, river.deck.length);
  const newCards = river.deck.slice(0, toAdd);
  const remainingDeck = river.deck.slice(toAdd);

  return {
    cards: [...river.cards, ...newCards],
    deck: remainingDeck,
  };
}
