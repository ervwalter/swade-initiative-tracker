// SWADE Card Scoring Utility
// Shared function to avoid circular dependencies between slices and selectors

import { CardId } from "../store/types";
import { BLACK_JOKER_ID, RED_JOKER_ID } from "../deck/cardIds";

/**
 * Calculate the SWADE initiative score for a card
 * Higher scores go first in initiative order
 * 
 * Scoring:
 * - Black Joker: 1001 (highest)
 * - Red Joker: 1000
 * - Regular cards: rank * 10 + suit
 *   - Ranks: A=14, K=13, Q=12, J=11, 10=10, ..., 2=2
 *   - Suits: S=4, H=3, D=2, C=1
 */
export const getCardScore = (cardId: CardId | undefined): number => {
  if (!cardId) return -1;
  
  // Jokers are highest priority
  if (cardId === BLACK_JOKER_ID) return 1001; // Black Joker beats Red Joker
  if (cardId === RED_JOKER_ID) return 1000;
  
  // For regular cards, parse rank and suit
  const rank = cardId.slice(0, -1);
  const suit = cardId.slice(-1);
  
  // Rank values (Ace high)
  const rankValues: Record<string, number> = {
    'A': 14, 'K': 13, 'Q': 12, 'J': 11,
    '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
  };
  
  // Suit values (Spades > Hearts > Diamonds > Clubs)
  const suitValues: Record<string, number> = { 'S': 4, 'H': 3, 'D': 2, 'C': 1 };
  
  const rankValue = rankValues[rank] || 0;
  const suitValue = suitValues[suit] || 0;
  
  // Combine: rank * 10 + suit (ensures rank is primary, suit is tiebreaker)
  return rankValue * 10 + suitValue;
};