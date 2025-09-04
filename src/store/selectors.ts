// RTK Selectors for SWADE state
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './store';
import { CardId, ParticipantRow, Card } from './types';
import { buildCardsLookup, RED_JOKER_ID, BLACK_JOKER_ID } from '../deck/cardIds';

// Static cards lookup - never changes
export const cardsLookup = buildCardsLookup();

// Base selectors
export const selectSwadeState = (state: RootState) => state.swade;
export const selectDeck = (state: RootState) => state.swade.deck;
export const selectRows = (state: RootState) => state.swade.rows;
export const selectTurn = (state: RootState) => state.swade.turn;
export const selectRound = (state: RootState) => state.swade.round;
export const selectPhase = (state: RootState) => state.swade.phase;
export const selectSettings = (state: RootState) => state.swade.settings;

// Helper: Score a card for SWADE ordering
import { getCardScore } from "../utils/cardScoring";

// THE main selector - returns participants in stored array order (no sorting)
export const selectParticipants = createSelector(
  [selectRows],
  (rows): ParticipantRow[] => {
    // Simply return the array as-is - order is maintained by actions
    return rows;
  }
);

// Navigable participants - now includes everyone for simplified navigation
export const selectNavigableParticipants = createSelector(
  [selectParticipants],
  (participants): ParticipantRow[] => {
    // Include all participants - Prev/Next will navigate through everyone
    return participants;
  }
);

// Turn navigation selectors
export const selectActiveParticipant = createSelector(
  [selectRows, selectTurn],
  (rows, turn) => turn.activeRowId ? rows.find(r => r.id === turn.activeRowId) || null : null
);

export const selectNextParticipant = createSelector(
  [selectNavigableParticipants, selectTurn],
  (participants, turn) => {
    if (!turn.activeRowId) return participants[0] || null;
    const currentIndex = participants.findIndex(p => p.id === turn.activeRowId);
    return participants[currentIndex + 1] || null;
  }
);

export const selectPreviousParticipant = createSelector(
  [selectNavigableParticipants, selectTurn],
  (participants, turn) => {
    if (!turn.activeRowId) return null;
    const currentIndex = participants.findIndex(p => p.id === turn.activeRowId);
    return currentIndex > 0 ? participants[currentIndex - 1] : null;
  }
);

// Deal eligibility selectors
export const selectEligibleForCard = createSelector(
  [selectRows],
  (rows) => rows.filter(r => !r.inactive && !r.onHold)
);

export const selectNeedsCard = createSelector(
  [selectEligibleForCard],
  (eligible) => eligible.filter(r => !r.currentCardId)
);

// Deck selectors
export const selectDeckCounts = createSelector(
  [selectDeck],
  (deck) => ({
    remaining: deck.remaining.length,
    inPlay: deck.inPlay.length,
    discard: deck.discard.length,
    total: deck.remaining.length + deck.inPlay.length + deck.discard.length
  })
);

export const selectNeedsReshuffle = (state: RootState) => 
  state.swade.deck.reshuffleAfterRound;

export const selectParticipantCount = createSelector(
  [selectRows],
  (rows) => rows.length
);

// Game status selector
export const selectGameSummary = createSelector(
  [selectRound, selectPhase, selectDeckCounts, selectRows],
  (round, phase, deckCounts, rows) => ({
    round,
    phase,
    participants: rows.length,
    deck: deckCounts
  })
);

// Utility selectors
export const selectParticipantById = (participantId: string) =>
  createSelector(
    [selectRows],
    (rows) => rows.find(r => r.id === participantId) || null
  );

export const selectParticipantsWithMultipleCandidates = createSelector(
  [selectRows],
  (rows) => rows.filter(r => r.candidateIds.length > 1)
);