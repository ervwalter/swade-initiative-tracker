// RTK Selectors for SWADE state
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from './store';
import { CardId, ParticipantRow, Card } from './types';
import { buildCardsLookup } from '../deck/cardIds';

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
const getCardScore = (cardId: CardId | undefined): number => {
  if (!cardId) return -1; // No card = lowest priority
  
  const card = cardsLookup[cardId];
  if (!card) return -1;
  
  // Jokers first (Black=1000, Red=999)
  if (card.rank === 'JOKER') {
    return card.jokerColor === 'BLACK' ? 1000 : 999;
  }
  
  // Rank score (A=14 down to 2=2)
  const rankScores: Record<string, number> = { 
    'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, 
    '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 
  };
  const rankScore = rankScores[card.rank] || 0;
  
  // Suit score (S=4, H=3, D=2, C=1)
  const suitScores: Record<string, number> = { 'S': 4, 'H': 3, 'D': 2, 'C': 1 };
  const suitScore = card.suit ? (suitScores[card.suit] || 0) : 0;
  
  // Combine: rank * 10 + suit (so Ace of Spades = 144, Two of Clubs = 21)
  return rankScore * 10 + suitScore;
};

// THE main selector - returns ALL participants in SWADE initiative order
export const selectParticipants = createSelector(
  [selectRows, selectTurn],
  (rows, turn): ParticipantRow[] => {
    const participants = Object.values(rows);
    
    // Sort by card scores (SWADE initiative order)
    const sorted = participants.sort((a, b) => {
      const scoreA = getCardScore(a.currentCardId);
      const scoreB = getCardScore(b.currentCardId);
      return scoreB - scoreA; // Descending order (best cards first)
    });
    
    // Handle Act Now insertions if present
    if (turn.actNow && turn.actNow.length > 0 && turn.activeRowId) {
      const activeIndex = sorted.findIndex(p => p.id === turn.activeRowId);
      if (activeIndex > -1) {
        // Remove act now participants from their sorted positions
        const actNowParticipants = turn.actNow.map(entry => rows[entry.rowId]).filter(Boolean);
        const withoutActNow = sorted.filter(p => !turn.actNow!.some(entry => entry.rowId === p.id));
        
        // Insert them at the specified positions relative to active participant
        let insertIndex = withoutActNow.findIndex(p => p.id === turn.activeRowId);
        turn.actNow.forEach(entry => {
          const participant = rows[entry.rowId];
          if (participant) {
            const pos = entry.position === 'before' ? insertIndex : insertIndex + 1;
            withoutActNow.splice(pos, 0, participant);
            if (entry.position === 'before') insertIndex++;
          }
        });
        
        return withoutActNow;
      }
    }
    
    return sorted;
  }
);

// Turn navigation selectors
export const selectActiveParticipant = createSelector(
  [selectRows, selectTurn],
  (rows, turn) => turn.activeRowId ? rows[turn.activeRowId] : null
);

export const selectNextParticipant = createSelector(
  [selectParticipants, selectTurn],
  (participants, turn) => {
    if (!turn.activeRowId) return participants[0] || null;
    const currentIndex = participants.findIndex(p => p.id === turn.activeRowId);
    return participants[currentIndex + 1] || null;
  }
);

export const selectPreviousParticipant = createSelector(
  [selectParticipants, selectTurn],
  (participants, turn) => {
    if (!turn.activeRowId) return null;
    const currentIndex = participants.findIndex(p => p.id === turn.activeRowId);
    return currentIndex > 0 ? participants[currentIndex - 1] : null;
  }
);

// Deal eligibility selectors
export const selectEligibleForCard = createSelector(
  [selectRows],
  (rows) => Object.values(rows).filter(r => !r.inactive && !r.onHold)
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
  (rows) => Object.keys(rows).length
);

// Game status selector
export const selectGameSummary = createSelector(
  [selectRound, selectPhase, selectDeckCounts, selectRows],
  (round, phase, deckCounts, rows) => ({
    round,
    phase,
    participants: Object.keys(rows).length,
    deck: deckCounts
  })
);

// Utility selectors
export const selectParticipantById = (participantId: string) =>
  createSelector(
    [selectRows],
    (rows) => rows[participantId] || null
  );

export const selectParticipantsWithMultipleCandidates = createSelector(
  [selectRows],
  (rows) => Object.values(rows).filter(r => r.candidateIds.length > 1)
);