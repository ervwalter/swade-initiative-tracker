// SWADE Initiative Tracker - Game State Management

import { EncounterState, CardId, ParticipantRow } from "../store/types";
import { discardAllInPlay, drawCard, reshuffleDeck } from "./deck";

/**
 * Get all cards currently "in play" (drawn from deck, whether assigned to participants or not)
 */
export function getCardsInPlay(state: EncounterState): CardId[] {
  // Cards in play are now tracked directly in the deck
  return [...state.deck.inPlay];
}

/**
 * Get cards specifically assigned to participants (subset of cards in play)
 */
export function getParticipantCards(state: EncounterState): CardId[] {
  const participantCards: CardId[] = [];
  
  for (const row of Object.values(state.rows)) {
    // Add current card if exists
    if (row.currentCardId) {
      participantCards.push(row.currentCardId);
    }
    
    // Add any candidate cards (for replacement draws)
    participantCards.push(...row.candidateIds);
  }
  
  // Remove duplicates (currentCard might also be in candidateIds)
  return [...new Set(participantCards)];
}

/**
 * End round: move all cards from inPlay to discard pile and clear participant cards
 */
export function endRound(state: EncounterState): void {
  // Move all cards from deck.inPlay to deck.discard
  const discardedCards = discardAllInPlay(state.deck);
  
  // Clear participant cards and per-round flags
  for (const row of Object.values(state.rows)) {
    row.currentCardId = undefined;
    row.candidateIds = [];
    row.drewThisRound = false;
  }
  
  // Handle reshuffle if needed
  if (state.deck.reshuffleAfterRound) {
    reshuffleDeck(state.deck);
    state.deck.reshuffleAfterRound = false;
  }
  
  // Update phase and increment round
  state.round += 1;
  state.phase = 'between_rounds';
  
  console.log(`[GAME] Round ${state.round - 1} ended. ${discardedCards.length} cards discarded.`);
}

/**
 * Deal a card to a specific participant (for testing)
 */
export function dealCardToParticipant(state: EncounterState, participantId: string): CardId | null {
  const participant = state.rows[participantId];
  if (!participant) {
    console.error('[GAME] Participant not found:', participantId);
    return null;
  }
  
  // Use the proper drawCard function which moves card to inPlay
  const result = drawCard(state.deck);
  if (!result.cardId) {
    console.log('[GAME] No card available to deal');
    return null;
  }
  
  participant.currentCardId = result.cardId;
  participant.candidateIds = [result.cardId];
  participant.drewThisRound = true;
  
  console.log(`[GAME] Dealt ${result.cardId} to ${participant.name}`);
  return result.cardId;
}

/**
 * Create a test participant for console testing
 */
export function createTestParticipant(state: EncounterState, name: string): string {
  const id = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  state.rows[id] = {
    id,
    name,
    tokenIds: [],
    type: 'PC',
    inactive: false,
    onHold: false,
    currentCardId: undefined,
    candidateIds: [],
    drewThisRound: false,
    revealed: true
  };
  
  console.log(`[GAME] Created test participant: ${name} (${id})`);
  return id;
}

/**
 * Get summary of current game state
 */
export function getGameStateSummary(state: EncounterState): {
  round: number;
  phase: string;
  participants: number;
  cardsInPlay: number;
  deckRemaining: number;
  deckInPlay: number;
  deckDiscard: number;
  totalCards: number;
} {
  const cardsInPlay = getCardsInPlay(state);
  
  return {
    round: state.round,
    phase: state.phase,
    participants: Object.keys(state.rows).length,
    cardsInPlay: cardsInPlay.length,
    deckRemaining: state.deck.remaining.length,
    deckInPlay: state.deck.inPlay.length,
    deckDiscard: state.deck.discard.length,
    totalCards: state.deck.remaining.length + state.deck.inPlay.length + state.deck.discard.length
  };
}