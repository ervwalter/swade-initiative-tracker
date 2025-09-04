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
 * Parse a card ID back into its components
 * Returns null if the ID format is invalid
 */
export function parseCardId(id: CardId): {
  rank: Rank | 'JOKER';
  suit?: Suit;
  jokerColor?: 'RED' | 'BLACK';
} | null {
  // Handle Jokers
  if (id === RED_JOKER_ID) {
    return { rank: 'JOKER', jokerColor: 'RED' };
  }
  if (id === BLACK_JOKER_ID) {
    return { rank: 'JOKER', jokerColor: 'BLACK' };
  }

  // Handle regular cards
  if (id.length < 2) return null;

  const suit = id.slice(-1) as Suit;
  const rank = id.slice(0, -1) as Rank;

  // Validate suit
  if (!['S', 'H', 'D', 'C'].includes(suit)) return null;

  // Validate rank
  const validRanks: Rank[] = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
  if (!validRanks.includes(rank)) return null;

  return { rank, suit };
}

/**
 * Get the display label for a card ID using the cards lookup
 */
export function getCardLabel(id: CardId, cards: Record<CardId, Card>): string {
  const card = cards[id];
  return card?.label || id;
}

/**
 * Validate that a card ID is properly formatted
 */
export function isValidCardId(id: CardId): boolean {
  return parseCardId(id) !== null;
}

/**
 * Check if a card ID represents a Joker
 */
export function isJoker(id: CardId): boolean {
  return id === RED_JOKER_ID || id === BLACK_JOKER_ID;
}

/**
 * Get the suit priority for SWADE sorting (S > H > D > C)
 * Returns higher numbers for higher priority suits
 */
export function getSuitPriority(suit: Suit): number {
  switch (suit) {
    case 'S': return 4; // Spades (highest)
    case 'H': return 3; // Hearts  
    case 'D': return 2; // Diamonds
    case 'C': return 1; // Clubs (lowest)
  }
}

/**
 * Get the rank priority for SWADE sorting (A high to 2 low)
 * Returns higher numbers for higher priority ranks
 */
export function getRankPriority(rank: Rank): number {
  switch (rank) {
    case 'A': return 14;
    case 'K': return 13;
    case 'Q': return 12;
    case 'J': return 11;
    case '10': return 10;
    case '9': return 9;
    case '8': return 8;
    case '7': return 7;
    case '6': return 6;
    case '5': return 5;
    case '4': return 4;
    case '3': return 3;
    case '2': return 2;
  }
}

/**
 * Get the Joker priority for SWADE sorting (Black > Red)
 */
export function getJokerPriority(jokerColor: 'RED' | 'BLACK'): number {
  return jokerColor === 'BLACK' ? 2 : 1;
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