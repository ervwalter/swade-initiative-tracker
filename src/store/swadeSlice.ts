// SWADE Redux Slice
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EncounterState, CardId, ParticipantRow } from './types';
import { initializeEmptyState } from './roomState';
import { RED_JOKER_ID, BLACK_JOKER_ID } from '../utils/cardIds';

import { getCardScore } from "../utils/cardScoring";

const initialState: EncounterState = initializeEmptyState();

// Helper to increment revision on state changes (for sync loop detection)
const incrementRevision = (state: EncounterState) => {
  const oldRevision = state.revision ?? 0;
  state.revision = oldRevision + 1;
  console.log('[REVISION] Incremented from', oldRevision, 'to', state.revision);
};

// Helper for auto-revealing participants when they become active
const autoRevealParticipant = (state: EncounterState, participantId: string | null) => {
  if (participantId) {
    const participant = state.rows.find(p => p.id === participantId);
    if (participant && !participant.revealed) {
      participant.revealed = true;
      console.log(`[SWADE] Auto-revealed ${participant.name} on activation`);
    }
  }
};

// Shared Fisher-Yates shuffle utility
const fisherYatesShuffle = <T>(array: T[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

// Helper function to deal a single card, handling reshuffle if needed
const dealSingleCard = (state: EncounterState): CardId | null => {
  // If no cards remaining, reshuffle discard pile
  if (state.deck.remaining.length === 0) {
    if (state.deck.discard.length === 0) {
      console.error('[SWADE] Cannot deal card - no cards available in deck or discard');
      return null;
    }
    
    // Move discard back to remaining and shuffle
    state.deck.remaining.push(...state.deck.discard);
    state.deck.discard = [];
    fisherYatesShuffle(state.deck.remaining);
    console.log('[SWADE] Auto-reshuffled deck (was empty)');
  }
  
  // Deal the card
  const cardId = state.deck.remaining.pop();
  if (cardId) {
    state.deck.inPlay.push(cardId);
    
    // Check for Jokers to set reshuffle flag
    if (cardId === RED_JOKER_ID || cardId === BLACK_JOKER_ID) {
      state.deck.reshuffleAfterRound = true;
    }
    
    return cardId as CardId;
  }
  
  return null;
};

// Shared sorting function for participants by SWADE initiative order
const sortParticipantsByInitiative = (state: EncounterState) => {
  state.rows.sort((a, b) => {
    const scoreA = getCardScore(a.currentCardId);
    const scoreB = getCardScore(b.currentCardId);
    
    // Helper function to get sort priority
    const getSortPriority = (participant: ParticipantRow, score: number) => {
      // Jokers always first (score 1000+)
      if (score >= 1000) return 0;
      // Held participants second
      if (participant.onHold) return 1;
      // Regular card holders third
      if (score > -1) return 2;
      // Non-card holders last
      return 3;
    };
    
    const priorityA = getSortPriority(a, scoreA);
    const priorityB = getSortPriority(b, scoreB);
    
    // If different priorities, sort by priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Within same priority group, use specific sorting
    if (priorityA === 0) {
      // Both Jokers - sort by card score (Black > Red)
      return scoreB - scoreA;
    } else if (priorityA === 1) {
      // Both held - sort by type then name
      const typeOrder = { 'PC': 0, 'NPC': 1, 'GROUP': 2 };
      const typeA = typeOrder[a.type];
      const typeB = typeOrder[b.type];
      
      if (typeA !== typeB) {
        return typeA - typeB;
      }
      return a.name.localeCompare(b.name);
    } else if (priorityA === 2) {
      // Both have cards - sort by card score
      return scoreB - scoreA;
    } else {
      // Both no cards - sort by type then name
      const typeOrder = { 'PC': 0, 'NPC': 1, 'GROUP': 2 };
      const typeA = typeOrder[a.type];
      const typeB = typeOrder[b.type];
      
      if (typeA !== typeB) {
        return typeA - typeB;
      }
      return a.name.localeCompare(b.name);
    }
  });
};

export const swadeSlice = createSlice({
  name: 'swade',
  initialState,
  reducers: {
    // Card operations - candidate pattern
    addCandidateCard: (state, action: PayloadAction<string>) => {
      const participantId = action.payload;
      const participant = state.rows.find(p => p.id === participantId);
      if (!participant) {
        console.log('[SWADE] Cannot add candidate - participant not found');
        return;
      }
      
      const cardId = dealSingleCard(state);
      if (cardId) {
        participant.candidateIds.push(cardId);
        
        console.log(`[SWADE] Added candidate ${cardId} to ${participant.name}`,
          `(${participant.candidateIds.length} candidates)`);
      } else {
        console.error(`[SWADE] Failed to deal candidate card to ${participant.name}`);
      }
      incrementRevision(state);
    },

    selectKeeperCard: (state, action: PayloadAction<{participantId: string, cardId: string}>) => {
      const { participantId, cardId } = action.payload;
      const participant = state.rows.find(p => p.id === participantId);
      
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
      
      // Resort participants to reflect new initiative order
      sortParticipantsByInitiative(state);
      
      console.log(`[SWADE] ${participant.name} kept ${cardId} - participants resorted`);
      incrementRevision(state);
    },

    clearParticipantCard: (state, action: PayloadAction<string>) => {
      const participantId = action.payload;
      const participant = state.rows.find(p => p.id === participantId);
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

    undoLastDraw: (state, action: PayloadAction<string>) => {
      const participantId = action.payload;
      const participant = state.rows.find(p => p.id === participantId);
      if (!participant || participant.candidateIds.length === 0) return;
      
      // Remove the last drawn card (most recent)
      const lastCardId = participant.candidateIds.pop();
      if (lastCardId) {
        // Move card from inPlay back to top of remaining deck
        const inPlayIndex = state.deck.inPlay.indexOf(lastCardId);
        if (inPlayIndex > -1) {
          state.deck.inPlay.splice(inPlayIndex, 1);
          state.deck.remaining.push(lastCardId); // Put back on top of deck
        }
        
        console.log(`[SWADE] Undid draw of ${lastCardId} for ${participant.name}`);
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
      fisherYatesShuffle(state.deck.remaining);
      
      // Reset reshuffle flag
      state.deck.reshuffleAfterRound = false;
      
      console.log('[SWADE] Deck shuffled:', state.deck.remaining.length, 'cards');
      incrementRevision(state);
    },

    // Deal round - draws one card per eligible participant
    dealRound: (state) => {
      // Count eligible participants (array version)
      // Skip held participants and inactive Extras (GROUP), but deal to inactive PC/NPC (they need cards for incapacitation checks)
      const eligibleParticipants = state.rows.filter(row => 
        !row.onHold && !(row.inactive && row.type === 'GROUP')
      );
      
      // No need to check card count - dealSingleCard handles reshuffling automatically
      
      // Clear previous round data (array version)
      state.rows.forEach(row => {
        row.candidateIds = [];
        row.drewThisRound = false;
        // Keep currentCardId for held participants
        if (!row.onHold) {
          row.currentCardId = undefined;
        }
        
        // Re-hide NPCs if privacy is enabled
        if (state.settings.hideNpcFromPlayers && row.type !== 'PC') {
          row.revealed = false;
        }
      });
      
      let cardsDealt = 0;
      
      // Deal to eligible participants
      eligibleParticipants.forEach(row => {
        const cardId = dealSingleCard(state);
        if (cardId) {
          row.currentCardId = cardId;
          row.candidateIds = [cardId];
          row.drewThisRound = true;
          cardsDealt++;
          
          console.log(`[SWADE] Dealt ${cardId} to ${row.name}`);
        } else {
          console.error(`[SWADE] Failed to deal card to ${row.name} - no cards available`);
        }
      });
      
      // Now PHYSICALLY reorder the array by SWADE rules
      if (cardsDealt > 0) {
        sortParticipantsByInitiative(state);
      }
      
      // Only advance round if we successfully dealt cards
      if (cardsDealt > 0) {
        const wasSetup = state.round === 0;
        state.round = wasSetup ? 1 : state.round + 1;
        state.phase = 'cards_dealt';
        
        console.log(`[SWADE] ${wasSetup ? 'Started' : 'Advanced to'} Round ${state.round} (dealt ${cardsDealt} cards) and reordered array`);
      } else {
        console.error('[SWADE] Deal round failed - no cards were dealt');
      }
      
      incrementRevision(state);
    },

    // Start the actual round after cards are dealt and any adjustments made
    startRound: (state) => {
      if (state.phase !== 'cards_dealt') {
        console.error('[SWADE] Cannot start round - not in cards_dealt phase');
        return;
      }
      
      state.phase = 'in_round';
      
      // Auto-activate first participant in the sorted array (simplified navigation)
      const firstParticipant = state.rows[0];
      
      if (firstParticipant) {
        state.turn.activeRowId = firstParticipant.id;
        autoRevealParticipant(state, firstParticipant.id);
        console.log(`[SWADE] Started Round ${state.round} - activated ${firstParticipant.name} (first in initiative order)`);
      } else {
        console.log(`[SWADE] Started Round ${state.round} - no participants to activate`);
      }
      
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
      state.rows.forEach(row => {
        row.currentCardId = undefined;
        row.candidateIds = [];
        row.drewThisRound = false;
      });
      
      // Clear active turn navigation
      state.turn.activeRowId = null;
      
      // Handle reshuffle if needed
      if (state.deck.reshuffleAfterRound) {
        // Move all cards back to remaining and shuffle
        if (state.deck.discard.length > 0) {
          state.deck.remaining.push(...state.deck.discard);
          state.deck.discard = [];
        }
        
        // Fisher-Yates shuffle
        fisherYatesShuffle(state.deck.remaining);
        
        state.deck.reshuffleAfterRound = false;
        console.log('[SWADE] Auto-reshuffled deck after Joker round');
      }
      
      // Update game state
      state.phase = 'between_rounds';
      
      console.log(`[SWADE] Round ${state.round} ended`,
        `(${cardsDiscarded} cards discarded)`);
      incrementRevision(state);
    },

    // Participant management
    createParticipant: (state, action: PayloadAction<{
      name: string;
      type: 'PC' | 'NPC' | 'GROUP';
      tokenIds?: string[];
      imageUrl?: string;
    }>) => {
      const { name, type, tokenIds = [], imageUrl } = action.payload;
      const id = `p-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      
      const newParticipant: ParticipantRow = {
        id,
        name,
        tokenIds,
        imageUrl,
        type,
        inactive: false,
        onHold: false,
        currentCardId: undefined,
        candidateIds: [],
        drewThisRound: false,
        revealed: type === 'PC' // PCs always visible
      };
      
      // Add to array
      state.rows.push(newParticipant);
      
      // Handle late joiner - draw immediately if cards have been dealt
      if (state.phase === 'cards_dealt' || state.phase === 'in_round') {
        const cardId = dealSingleCard(state);
        if (cardId) {
          newParticipant.currentCardId = cardId;
          newParticipant.candidateIds = [cardId];
          newParticipant.drewThisRound = true;
          
          console.log(`[SWADE] Late joiner ${name} drew ${cardId}`);
        } else {
          console.error(`[SWADE] Failed to deal card to late joiner ${name}`);
        }
      }
      
      // Sort participants after adding
      sortParticipantsByInitiative(state);
      
      console.log(`[SWADE] Created participant: ${name} (${type}) - ID: ${id}`);
      incrementRevision(state);
    },

    removeParticipant: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const participantIndex = state.rows.findIndex(p => p.id === id);
      if (participantIndex === -1) {
        console.log('[SWADE] Participant not found for removal:', id);
        return;
      }
      
      const participant = state.rows[participantIndex];
      
      // Discard any cards they have
      [...participant.candidateIds].forEach(cardId => {
        const index = state.deck.inPlay.indexOf(cardId);
        if (index > -1) {
          state.deck.inPlay.splice(index, 1);
          state.deck.discard.push(cardId);
        }
      });
      
      // Remove from array
      state.rows.splice(participantIndex, 1);
      
      // Clear active turn if needed
      if (state.turn.activeRowId === id) {
        state.turn.activeRowId = null;
      }
      
      console.log(`[SWADE] Removed participant: ${participant.name}`);
      incrementRevision(state);
    },

    removeAllNpcsAndExtras: (state) => {
      const participantsToRemove = state.rows.filter(p => p.type === 'NPC' || p.type === 'GROUP');
      
      // Discard all cards from participants being removed
      participantsToRemove.forEach(participant => {
        [...participant.candidateIds].forEach(cardId => {
          const index = state.deck.inPlay.indexOf(cardId);
          if (index > -1) {
            state.deck.inPlay.splice(index, 1);
            state.deck.discard.push(cardId);
          }
        });
      });
      
      // Remove all NPCs and Extras (GROUP type)
      state.rows = state.rows.filter(p => p.type === 'PC');
      
      // Clear active turn if it was on a removed participant
      if (state.turn.activeRowId && !state.rows.find(p => p.id === state.turn.activeRowId)) {
        state.turn.activeRowId = null;
      }
      
      console.log(`[SWADE] Removed ${participantsToRemove.length} NPCs/Extras`);
      incrementRevision(state);
    },

    // Status setters (explicit, not toggles)
    setHold: (state, action: PayloadAction<{id: string, value: boolean}>) => {
      const { id, value } = action.payload;
      const participant = state.rows.find(p => p.id === id);
      if (!participant) return;
      
      participant.onHold = value;
      console.log(`[SWADE] ${participant.name} hold: ${value}`);
      incrementRevision(state);
    },

    setInactive: (state, action: PayloadAction<{id: string, value: boolean}>) => {
      const { id, value } = action.payload;
      const participant = state.rows.find(p => p.id === id);
      if (!participant) return;
      
      participant.inactive = value;
      console.log(`[SWADE] ${participant.name} inactive: ${value}`);
      incrementRevision(state);
    },

    setRevealed: (state, action: PayloadAction<{id: string, value: boolean}>) => {
      const { id, value } = action.payload;
      const participant = state.rows.find(p => p.id === id);
      if (!participant) return;
      
      participant.revealed = value;
      console.log(`[SWADE] ${participant.name} revealed: ${value}`);
      incrementRevision(state);
    },

    setParticipantType: (state, action: PayloadAction<{id: string, type: 'PC' | 'NPC' | 'GROUP'}>) => {
      const { id, type } = action.payload;
      const participant = state.rows.find(p => p.id === id);
      if (!participant) return;
      
      participant.type = type;
      console.log(`[SWADE] ${participant.name} type changed to: ${type}`);
      incrementRevision(state);
    },
    
    renameParticipant: (state, action: PayloadAction<{id: string, name: string}>) => {
      const { id, name } = action.payload;
      const participant = state.rows.find(p => p.id === id);
      if (!participant) return;
      
      const trimmedName = name.trim();
      if (trimmedName) {
        participant.name = trimmedName;
        console.log(`[SWADE] Renamed participant to: ${trimmedName}`);
        incrementRevision(state);
      }
    },

    // Lose hold due to Shaken/Stunned - clears hold and stays in place
    loseHold: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const participant = state.rows.find(p => p.id === id);
      if (!participant) return;
      
      // Clear hold status and current card - participant stays in same position
      participant.onHold = false;
      participant.currentCardId = undefined;
      participant.candidateIds = [];
      
      // Don't move them! They just lose their turn where they are.
      // Navigation will handle skipping them since they no longer have onHold=true
      
      console.log(`[SWADE] ${participant.name} lost hold (Shaken/Stunned) - staying in position`);
      incrementRevision(state);
    },

    // Turn management
    setActiveParticipant: (state, action: PayloadAction<string | null>) => {
      const id = action.payload;
      state.turn.activeRowId = id;
      
      // Auto-reveal if setting active on hidden participant
      autoRevealParticipant(state, id);
      
      const activeParticipant = id ? state.rows.find(p => p.id === id) : null;
      console.log(`[SWADE] Active participant: ${activeParticipant?.name || 'none'}`);
      incrementRevision(state);
    },

    // Act Now - physically move participant in array
    insertActNow: (state, action: PayloadAction<{id: string, placement: 'before' | 'after'}>) => {
      const { id, placement } = action.payload;
      const participantIndex = state.rows.findIndex(p => p.id === id);
      if (participantIndex === -1) return;
      
      const participant = state.rows[participantIndex];
      
      // Clear hold
      participant.onHold = false;
      
      // Find the active participant's position
      const activeId = state.turn.activeRowId;
      if (!activeId) {
        console.log('[SWADE] No active participant to insert relative to');
        return;
      }
      
      const activeIndex = state.rows.findIndex(p => p.id === activeId);
      if (activeIndex === -1) {
        console.log('[SWADE] Active participant not found in array');
        return;
      }
      
      // Remove participant from current position
      state.rows.splice(participantIndex, 1);
      
      // Calculate insertion position (adjust for removal if needed)
      let insertIndex = activeIndex;
      if (participantIndex < activeIndex) {
        insertIndex--; // Adjust because we removed an item before the active participant
      }
      
      // Insert before or after active participant
      if (placement === 'before') {
        state.rows.splice(insertIndex, 0, participant);
      } else {
        state.rows.splice(insertIndex + 1, 0, participant);
      }
      
      // Handle active participant based on placement:
      // - "before": interrupting, so they become active
      // - "after": waiting until later, so current participant stays active
      if (placement === 'before') {
        state.turn.activeRowId = id;
      }
      // If placement === 'after', keep the original active participant
      
      // Always reveal participant when they act now (regardless of placement)
      autoRevealParticipant(state, id);
      
      console.log(`[SWADE] ${participant.name} acting now (${placement}) - moved in array`);
      incrementRevision(state);
    },

    // Settings
    setPrivacy: (state, action: PayloadAction<boolean>) => {
      state.settings.hideNpcFromPlayers = action.payload;
      console.log(`[SWADE] Privacy: ${action.payload ? 'enabled' : 'disabled'}`);
      incrementRevision(state);
    },

    setModalResult: (state, action: PayloadAction<'confirmed' | 'cancelled' | undefined>) => {
      state.modalResult = action.payload;
      incrementRevision(state); // Need revision increment for cross-frame sync
    },

    // System operations
    endInitiative: (state) => {
      // Keep participants but clear their card states and reset privacy
      state.rows.forEach(participant => {
        participant.currentCardId = undefined;
        participant.candidateIds = [];
        participant.drewThisRound = false;
        participant.onHold = false;
        
        // Reset revealed status based on privacy mode
        if (state.settings.hideNpcFromPlayers && (participant.type === 'NPC' || participant.type === 'GROUP')) {
          participant.revealed = false;
        }
      });
      
      // Reset deck to fresh shuffled state
      const allCardIds = state.deck.remaining.concat(state.deck.inPlay, state.deck.discard);
      const shuffled = [...allCardIds];
      fisherYatesShuffle(shuffled);
      
      state.deck = {
        remaining: shuffled,
        inPlay: [],
        discard: [],
        reshuffleAfterRound: false
      };
      
      // Reset round and phase
      state.round = 0;
      state.phase = 'setup';
      
      // Clear active participant
      state.turn.activeRowId = null;
      
      console.log('[SWADE] Initiative ended - participants kept, deck/round reset');
      incrementRevision(state);
    },

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
  undoLastDraw,
  discardCard,
  shuffleDeck,
  
  // Round management
  dealRound,
  startRound,
  endRound,
  
  // Participant management
  createParticipant,
  removeParticipant,
  removeAllNpcsAndExtras,
  
  // Status setters
  setHold,
  loseHold,
  setInactive,
  setRevealed,
  setParticipantType,
  renameParticipant,
  
  // Turn management
  setActiveParticipant,
  insertActNow,
  
  // Settings
  setPrivacy,
  setModalResult,
  
  // System
  endInitiative,
  reset,
  setEncounterState
} = swadeSlice.actions;

// Export reducer
export default swadeSlice.reducer;