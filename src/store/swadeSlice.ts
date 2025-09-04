// SWADE Redux Slice
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EncounterState, CardId } from './types';
import { initializeEmptyState } from './roomState';

const initialState: EncounterState = initializeEmptyState();

// Helper to increment revision on state changes (for sync loop detection)
const incrementRevision = (state: EncounterState) => {
  const oldRevision = state.revision ?? 0;
  state.revision = oldRevision + 1;
  console.log('[REVISION] Incremented from', oldRevision, 'to', state.revision);
};

export const swadeSlice = createSlice({
  name: 'swade',
  initialState,
  reducers: {
    // Card operations - candidate pattern
    addCandidateCard: (state, action: PayloadAction<string>) => {
      const participantId = action.payload;
      const participant = state.rows[participantId];
      if (!participant || state.deck.remaining.length === 0) {
        console.log('[SWADE] Cannot add candidate - participant not found or no cards');
        return;
      }
      
      const cardId = state.deck.remaining.pop();
      if (cardId) {
        state.deck.inPlay.push(cardId);
        participant.candidateIds.push(cardId);
        
        // Check for joker
        if (cardId === 'JK-R' || cardId === 'JK-B') {
          state.deck.reshuffleAfterRound = true;
        }
        
        console.log(`[SWADE] Added candidate ${cardId} to ${participant.name}`,
          `(${participant.candidateIds.length} candidates)`);
      }
      incrementRevision(state);
    },

    selectKeeperCard: (state, action: PayloadAction<{participantId: string, cardId: string}>) => {
      const { participantId, cardId } = action.payload;
      const participant = state.rows[participantId];
      
      if (!participant || !participant.candidateIds.includes(cardId)) {
        console.error('[SWADE] Invalid keeper selection:', participantId, cardId);
        return;
      }
      
      // Discard non-kept candidates
      participant.candidateIds.forEach(cid => {
        if (cid !== cardId) {
          const index = state.deck.inPlay.indexOf(cid);
          if (index > -1) {
            state.deck.inPlay.splice(index, 1);
            state.deck.discard.push(cid);
          }
        }
      });
      
      // Set keeper
      participant.currentCardId = cardId;
      participant.candidateIds = [cardId]; // Keep only the selected card
      
      console.log(`[SWADE] ${participant.name} kept ${cardId}`);
      incrementRevision(state);
    },

    clearParticipantCard: (state, action: PayloadAction<string>) => {
      const participantId = action.payload;
      const participant = state.rows[participantId];
      if (!participant) return;
      
      // Move all candidate cards to discard
      participant.candidateIds.forEach(cardId => {
        const index = state.deck.inPlay.indexOf(cardId);
        if (index > -1) {
          state.deck.inPlay.splice(index, 1);
          state.deck.discard.push(cardId);
        }
      });
      
      participant.currentCardId = undefined;
      participant.candidateIds = [];
      participant.drewThisRound = false;
      
      console.log(`[SWADE] Cleared cards for ${participant.name}`);
      incrementRevision(state);
    },

    // Legacy drawCard for simple deck testing
    drawCard: (state) => {
      const cardId = state.deck.remaining.pop();
      if (cardId) {
        state.deck.inPlay.push(cardId);
        console.log('[SWADE] Drew card:', cardId, 
          `(${state.deck.remaining.length} remaining, ${state.deck.inPlay.length} in play)`);
      } else {
        console.log('[SWADE] No cards remaining to draw');
      }
      incrementRevision(state);
    },

    discardCard: (state, action: PayloadAction<CardId>) => {
      const cardId = action.payload;
      const inPlayIndex = state.deck.inPlay.indexOf(cardId);
      if (inPlayIndex > -1) {
        state.deck.inPlay.splice(inPlayIndex, 1);
        state.deck.discard.push(cardId);
        console.log('[SWADE] Discarded:', cardId, 
          `(${state.deck.inPlay.length} in play, ${state.deck.discard.length} discarded)`);
      } else {
        console.log('[SWADE] Card not found in play:', cardId);
      }
      incrementRevision(state);
    },

    shuffleDeck: (state) => {
      // Move all discard cards back to remaining
      if (state.deck.discard.length > 0) {
        state.deck.remaining.push(...state.deck.discard);
        state.deck.discard = [];
      }
      
      // Fisher-Yates shuffle of remaining cards
      const remaining = state.deck.remaining;
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      
      // Reset reshuffle flag
      state.deck.reshuffleAfterRound = false;
      
      console.log('[SWADE] Deck shuffled:', remaining.length, 'cards');
      incrementRevision(state);
    },

    // Deal round - draws one card per eligible participant
    dealRound: (state) => {
      // Clear previous round data
      Object.values(state.rows).forEach(row => {
        row.candidateIds = [];
        row.drewThisRound = false;
        // Keep currentCardId for held participants
        if (!row.onHold) {
          row.currentCardId = undefined;
        }
      });
      
      // Deal to eligible participants
      Object.values(state.rows).forEach(row => {
        if (!row.inactive && !row.onHold && state.deck.remaining.length > 0) {
          const cardId = state.deck.remaining.pop();
          if (cardId) {
            state.deck.inPlay.push(cardId);
            row.currentCardId = cardId;
            row.candidateIds = [cardId];
            row.drewThisRound = true;
            
            // Check for Jokers
            if (cardId === 'JK-R' || cardId === 'JK-B') {
              state.deck.reshuffleAfterRound = true;
            }
            
            console.log(`[SWADE] Dealt ${cardId} to ${row.name}`);
          }
        }
      });
      
      // Update round and phase
      const wasSetup = state.round === 0;
      state.round = wasSetup ? 1 : state.round + 1;
      state.phase = 'in_round';
      console.log(`[SWADE] ${wasSetup ? 'Started' : 'Advanced to'} Round ${state.round}`);
      incrementRevision(state);
    },

    // Game state operations
    endRound: (state) => {
      const cardsDiscarded = state.deck.inPlay.length;
      
      // Move all cards from inPlay to discard
      if (state.deck.inPlay.length > 0) {
        state.deck.discard.push(...state.deck.inPlay);
        state.deck.inPlay = [];
      }
      
      // Clear participant cards and per-round flags
      Object.values(state.rows).forEach(row => {
        row.currentCardId = undefined;
        row.candidateIds = [];
        row.drewThisRound = false;
      });
      
      // Handle reshuffle if needed
      if (state.deck.reshuffleAfterRound) {
        // Move all cards back to remaining and shuffle
        if (state.deck.discard.length > 0) {
          state.deck.remaining.push(...state.deck.discard);
          state.deck.discard = [];
        }
        
        // Fisher-Yates shuffle
        const remaining = state.deck.remaining;
        for (let i = remaining.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        
        state.deck.reshuffleAfterRound = false;
        console.log('[SWADE] Auto-reshuffled deck after Joker round');
      }
      
      // Update game state
      const previousRound = state.round;
      state.round += 1;
      state.phase = 'between_rounds';
      
      console.log(`[SWADE] Round ${previousRound} ended → Round ${state.round}`,
        `(${cardsDiscarded} cards discarded)`);
      incrementRevision(state);
    },

    // Participant management
    createParticipant: (state, action: PayloadAction<{
      name: string;
      type: 'PC' | 'NPC' | 'GROUP';
      tokenIds?: string[];
      dealNow?: boolean;
    }>) => {
      const { name, type, tokenIds = [], dealNow = false } = action.payload;
      const id = `p-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      
      state.rows[id] = {
        id,
        name,
        tokenIds,
        type,
        inactive: false,
        onHold: false,
        currentCardId: undefined,
        candidateIds: [],
        drewThisRound: false,
        revealed: type === 'PC' // PCs always visible
      };
      
      // Handle late joiner - draw immediately if requested
      if (dealNow && state.phase === 'in_round' && state.deck.remaining.length > 0) {
        const cardId = state.deck.remaining.pop();
        if (cardId) {
          state.deck.inPlay.push(cardId);
          state.rows[id].currentCardId = cardId;
          state.rows[id].candidateIds = [cardId];
          state.rows[id].drewThisRound = true;
          
          if (cardId === 'JK-R' || cardId === 'JK-B') {
            state.deck.reshuffleAfterRound = true;
          }
          
          console.log(`[SWADE] Late joiner ${name} drew ${cardId}`);
        }
      }
      
      console.log(`[SWADE] Created participant: ${name} (${type}) - ID: ${id}`);
      incrementRevision(state);
    },

    removeParticipant: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const participant = state.rows[id];
      if (!participant) {
        console.log('[SWADE] Participant not found for removal:', id);
        return;
      }
      
      // Discard any cards they have
      [...participant.candidateIds].forEach(cardId => {
        const index = state.deck.inPlay.indexOf(cardId);
        if (index > -1) {
          state.deck.inPlay.splice(index, 1);
          state.deck.discard.push(cardId);
        }
      });
      
      delete state.rows[id];
      
      // Clear active turn if needed
      if (state.turn.activeRowId === id) {
        state.turn.activeRowId = null;
      }
      
      // Remove from act now if present
      if (state.turn.actNow) {
        state.turn.actNow = state.turn.actNow.filter(entry => entry.rowId !== id);
      }
      
      console.log(`[SWADE] Removed participant: ${participant.name}`);
      incrementRevision(state);
    },

    // Status setters (explicit, not toggles)
    setHold: (state, action: PayloadAction<{id: string, value: boolean}>) => {
      const { id, value } = action.payload;
      const participant = state.rows[id];
      if (!participant) return;
      
      participant.onHold = value;
      console.log(`[SWADE] ${participant.name} hold: ${value}`);
      incrementRevision(state);
    },

    setInactive: (state, action: PayloadAction<{id: string, value: boolean}>) => {
      const { id, value } = action.payload;
      const participant = state.rows[id];
      if (!participant) return;
      
      participant.inactive = value;
      console.log(`[SWADE] ${participant.name} inactive: ${value}`);
      incrementRevision(state);
    },

    setRevealed: (state, action: PayloadAction<{id: string, value: boolean}>) => {
      const { id, value } = action.payload;
      const participant = state.rows[id];
      if (!participant) return;
      
      participant.revealed = value;
      console.log(`[SWADE] ${participant.name} revealed: ${value}`);
      incrementRevision(state);
    },

    // Turn management
    setActiveParticipant: (state, action: PayloadAction<string | null>) => {
      const id = action.payload;
      state.turn.activeRowId = id;
      
      // Auto-reveal if setting active on hidden participant
      if (id) {
        const participant = state.rows[id];
        if (participant && !participant.revealed) {
          participant.revealed = true;
          console.log(`[SWADE] Auto-revealed ${participant.name} on activation`);
        }
      }
      
      console.log(`[SWADE] Active participant: ${id ? state.rows[id]?.name : 'none'}`);
      incrementRevision(state);
    },

    // Act Now
    insertActNow: (state, action: PayloadAction<{id: string, placement: 'before' | 'after'}>) => {
      const { id, placement } = action.payload;
      const participant = state.rows[id];
      if (!participant) return;
      
      // Clear hold
      participant.onHold = false;
      
      // Add to act now array
      if (!state.turn.actNow) state.turn.actNow = [];
      state.turn.actNow.push({ rowId: id, position: placement });
      
      // Set as active and reveal
      state.turn.activeRowId = id;
      participant.revealed = true;
      
      console.log(`[SWADE] ${participant.name} acting now (${placement})`);
      incrementRevision(state);
    },

    // Settings
    setPrivacy: (state, action: PayloadAction<boolean>) => {
      state.settings.hideNpcFromPlayers = action.payload;
      console.log(`[SWADE] Privacy: ${action.payload ? 'enabled' : 'disabled'}`);
      incrementRevision(state);
    },

    // System operations
    reset: () => {
      console.log('[SWADE] State reset to initial');
      return initializeEmptyState();
    },

    setEncounterState: (state, action: PayloadAction<EncounterState>) => {
      console.log('[SWADE] State synced from OBR room metadata');
      return action.payload;
    },

    // Note: Revision increments are now handled within each state-changing reducer
  }
});

// Export actions
export const {
  // Card operations
  addCandidateCard,
  selectKeeperCard,
  clearParticipantCard,
  drawCard, // Legacy for testing
  discardCard,
  shuffleDeck,
  
  // Round management
  dealRound,
  endRound,
  
  // Participant management
  createParticipant,
  removeParticipant,
  
  // Status setters
  setHold,
  setInactive,
  setRevealed,
  
  // Turn management
  setActiveParticipant,
  insertActNow,
  
  // Settings
  setPrivacy,
  
  // System
  reset,
  setEncounterState
} = swadeSlice.actions;

// Export reducer
export default swadeSlice.reducer;