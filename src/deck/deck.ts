// SWADE Initiative Tracker - Deck Operations

import { Card, CardId, Deck } from "../state/types";

/**
 * Fisher-Yates shuffle algorithm for randomizing card order
 */
export function shuffleDeck(cardIds: CardId[]): CardId[] {
  const shuffled = [...cardIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Draw a card from the deck (pop from end of remaining array)
 * Moves card to inPlay pile to track it properly
 * Automatically reshuffles discard into remaining if deck is empty
 * Returns null if both piles are empty
 */
export function drawCard(deck: Deck): { cardId: CardId | null, needsStateUpdate: boolean } {
  // If remaining deck is empty, reshuffle discard pile
  if (deck.remaining.length === 0 && deck.discard.length > 0) {
    const shuffled = shuffleDeck(deck.discard);
    deck.remaining = shuffled;
    deck.discard = [];
    console.log('[DECK] Auto-reshuffle: Moved', shuffled.length, 'cards from discard to remaining');
  }

  // If still no cards available, return null
  if (deck.remaining.length === 0) {
    console.log('[DECK] No cards available to draw');
    return { cardId: null, needsStateUpdate: false };
  }

  // Draw from the top of the deck (end of array) and move to inPlay
  const cardId = deck.remaining.pop()!;
  deck.inPlay.push(cardId);
  console.log('[DECK] Drew card:', cardId, '- Remaining:', deck.remaining.length, 'InPlay:', deck.inPlay.length);
  
  return { cardId, needsStateUpdate: true };
}

/**
 * Add a card to the discard pile
 */
export function discardCard(deck: Deck, cardId: CardId): void {
  deck.discard.push(cardId);
  console.log('[DECK] Discarded card:', cardId, '- Discard pile:', deck.discard.length);
}

/**
 * Move a card from inPlay to discard pile
 */
export function discardFromInPlay(deck: Deck, cardId: CardId): boolean {
  const inPlayIndex = deck.inPlay.indexOf(cardId);
  if (inPlayIndex === -1) {
    console.warn('[DECK] Card not found in inPlay:', cardId);
    return false;
  }
  
  // Remove from inPlay and add to discard
  deck.inPlay.splice(inPlayIndex, 1);
  deck.discard.push(cardId);
  console.log('[DECK] Moved card from inPlay to discard:', cardId);
  return true;
}

/**
 * Move all cards from inPlay to discard (for end round)
 */
export function discardAllInPlay(deck: Deck): CardId[] {
  const cardsToDiscard = [...deck.inPlay];
  deck.discard.push(...cardsToDiscard);
  deck.inPlay = [];
  console.log('[DECK] Discarded all cards from inPlay:', cardsToDiscard.length, 'cards');
  return cardsToDiscard;
}

/**
 * Move all cards from discard pile back to remaining and shuffle
 * NOTE: This should typically only be done after ending a round when inPlay is empty
 */
export function reshuffleDeck(deck: Deck): void {
  if (deck.discard.length === 0) {
    console.log('[DECK] No cards to reshuffle');
    return;
  }

  if (deck.inPlay.length > 0) {
    console.warn('[DECK] Warning: Reshuffling with', deck.inPlay.length, 'cards still in play');
  }

  const cardsToShuffle = [...deck.remaining, ...deck.discard];
  deck.remaining = shuffleDeck(cardsToShuffle);
  deck.discard = [];
  
  console.log('[DECK] Reshuffled deck:', deck.remaining.length, 'cards');
}

/**
 * Check if a card ID represents a Joker
 */
export function isJoker(cardId: CardId): boolean {
  return cardId === 'JK-R' || cardId === 'JK-B';
}

/**
 * Set reshuffle flag if any Jokers are found in the provided card IDs
 */
export function updateReshuffleFlag(deck: Deck, cardIds: CardId[]): void {
  const hasJoker = cardIds.some(isJoker);
  if (hasJoker && !deck.reshuffleAfterRound) {
    deck.reshuffleAfterRound = true;
    console.log('[DECK] Joker detected - reshuffle flag set');
  }
}

/**
 * Initialize a fresh shuffled deck with all cards
 */
export function createShuffledDeck(allCardIds: CardId[]): { remaining: CardId[], discard: CardId[] } {
  return {
    remaining: shuffleDeck([...allCardIds]),
    discard: []
  };
}

// Console testing utilities
export function logDeckState(deck: Deck): void {
  console.log('[DECK STATE]', {
    remaining: deck.remaining.length,
    inPlay: deck.inPlay.length,
    discard: deck.discard.length,
    reshuffleAfterRound: deck.reshuffleAfterRound,
    nextCard: deck.remaining.length > 0 ? deck.remaining[deck.remaining.length - 1] : 'None',
    total: deck.remaining.length + deck.inPlay.length + deck.discard.length
  });
}

export function testDrawSequence(deck: Deck, count: number, cards: Record<CardId, Card>): CardId[] {
  const drawn: CardId[] = [];
  console.log(`[DECK TEST] Drawing ${count} cards...`);
  
  for (let i = 0; i < count; i++) {
    const result = drawCard(deck);
    if (result.cardId) {
      drawn.push(result.cardId);
      const card = cards[result.cardId];
      console.log(`  ${i + 1}. ${result.cardId} (${card?.label || 'Unknown'})`);
    } else {
      console.log(`  ${i + 1}. No more cards available`);
      break;
    }
  }
  
  logDeckState(deck);
  return drawn;
}

/**
 * Get a summary of cards in the deck for display
 */
export function getDeckSummary(deck: Deck, cards: Record<CardId, Card>): {
  remaining: string[];
  inPlay: string[];
  discard: string[];
  reshuffleAfterRound: boolean;
} {
  return {
    remaining: deck.remaining.map(id => cards[id]?.label || id),
    inPlay: deck.inPlay.map(id => cards[id]?.label || id),
    discard: deck.discard.map(id => cards[id]?.label || id),
    reshuffleAfterRound: deck.reshuffleAfterRound
  };
}