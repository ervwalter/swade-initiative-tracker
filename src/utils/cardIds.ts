// SWADE Initiative Tracker - Card ID Utilities

import { CardId, Suit, Rank, Card } from "../store/types";

// Card ID constants
export const RED_JOKER_ID = 'JK-R' as const;
export const BLACK_JOKER_ID = 'JK-B' as const;

/**
 * Generate deterministic card ID from rank and suit
 * Examples: "AS" (Ace of Spades), "10H" (Ten of Hearts), "JK-R" (Red Joker)
 */
export function getCardId(rank: Rank | 'JOKER', suit?: Suit, jokerColor?: 'RED' | 'BLACK'): CardId {
  if (rank === 'JOKER') {
    return jokerColor === 'RED' ? RED_JOKER_ID : BLACK_JOKER_ID;
  }
  return `${rank}${suit}`;
}


/**
 * Generate all card IDs for a standard 54-card deck
 */
export function generateAllCardIds(): CardId[] {
  const suits: Suit[] = ['S', 'H', 'D', 'C'];
  const ranks: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  const cardIds: CardId[] = [];
  
  // Add all regular cards
  for (const suit of suits) {
    for (const rank of ranks) {
      cardIds.push(getCardId(rank, suit));
    }
  }
  
  // Add Jokers
  cardIds.push(getCardId('JOKER', undefined, 'RED'));
  cardIds.push(getCardId('JOKER', undefined, 'BLACK'));
  
  return cardIds;
}

/**
 * Create a complete cards lookup table with labels
 */
export function buildCardsLookup(): Record<CardId, Card> {
  const cards: Record<CardId, Card> = {};
  
  // Suit symbols
  const suitSymbols = {
    'S': '♠',
    'H': '♥', 
    'D': '♦',
    'C': '♣'
  };
  
  const suits: Suit[] = ['S', 'H', 'D', 'C'];
  const ranks: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  // Create all regular cards
  for (const suit of suits) {
    for (const rank of ranks) {
      const cardId = getCardId(rank, suit);
      cards[cardId] = {
        id: cardId,
        rank,
        suit,
        label: `${rank}${suitSymbols[suit]}`
      };
    }
  }
  
  // Add Jokers
  cards[RED_JOKER_ID] = {
    id: RED_JOKER_ID,
    rank: 'JOKER',
    jokerColor: 'RED',
    label: 'Joker'
  };
  
  cards[BLACK_JOKER_ID] = {
    id: BLACK_JOKER_ID,
    rank: 'JOKER', 
    jokerColor: 'BLACK',
    label: 'Joker'
  };
  
  return cards;
}