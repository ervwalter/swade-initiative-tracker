// Scene metadata synchronization for SWADE Initiative Tracker

import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import { EncounterState, ParticipantRow, Card, CardId, getCardId } from "./types";

const PLUGIN_STATE_KEY = getPluginId("state");

// Generate the full 54-card deck with deterministic IDs
function buildStaticCards(): Record<CardId, Card> {
  const cards: Record<CardId, Card> = {};
  
  // Standard 52 cards
  const suits: Array<{ suit: 'S' | 'H' | 'D' | 'C', symbol: string }> = [
    { suit: 'S', symbol: '♠' },
    { suit: 'H', symbol: '♥' },
    { suit: 'D', symbol: '♦' },
    { suit: 'C', symbol: '♣' }
  ];
  
  const ranks: Array<{ rank: 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2', label: string }> = [
    { rank: 'A', label: 'A' },
    { rank: 'K', label: 'K' },
    { rank: 'Q', label: 'Q' },
    { rank: 'J', label: 'J' },
    { rank: '10', label: '10' },
    { rank: '9', label: '9' },
    { rank: '8', label: '8' },
    { rank: '7', label: '7' },
    { rank: '6', label: '6' },
    { rank: '5', label: '5' },
    { rank: '4', label: '4' },
    { rank: '3', label: '3' },
    { rank: '2', label: '2' }
  ];

  // Create all 52 cards
  for (const { suit, symbol } of suits) {
    for (const { rank, label } of ranks) {
      const cardId = getCardId(rank, suit);
      cards[cardId] = {
        id: cardId,
        rank,
        suit,
        label: `${label}${symbol}`
      };
    }
  }

  // Add the two Jokers
  cards['JK-R'] = {
    id: 'JK-R',
    rank: 'JOKER',
    jokerColor: 'RED',
    label: 'Red Joker'
  };

  cards['JK-B'] = {
    id: 'JK-B', 
    rank: 'JOKER',
    jokerColor: 'BLACK',
    label: 'Black Joker'
  };

  return cards;
}

// Create initial deck with all 54 cards
function createInitialDeck(): { remaining: CardId[], discard: CardId[] } {
  const allCardIds = Object.keys(buildStaticCards());
  return {
    remaining: [...allCardIds], // Will be shuffled later
    discard: []
  };
}

// Initialize empty encounter state
export function initializeEmptyState(): EncounterState {
  const { remaining, discard } = createInitialDeck();
  
  return {
    version: 1,
    round: 0,
    phase: 'setup',
    deck: {
      remaining,
      discard,
      reshuffleAfterRound: false
    },
    cards: buildStaticCards(),
    rows: {},
    turn: {
      activeRowId: null
    },
    settings: {
      hideNpcFromPlayers: false
    }
  };
}

// Read encounter state from scene metadata
export async function readEncounterState(): Promise<EncounterState | null> {
  try {
    const metadata = await OBR.scene.getMetadata();
    const stateData = metadata[PLUGIN_STATE_KEY];
    
    if (!stateData || typeof stateData !== 'object') {
      return null;
    }

    // Basic validation that this looks like an EncounterState
    if (
      typeof stateData === 'object' && 
      'version' in stateData && 
      'round' in stateData && 
      'phase' in stateData &&
      'deck' in stateData &&
      'cards' in stateData &&
      'rows' in stateData
    ) {
      return stateData as EncounterState;
    }

    return null;
  } catch (error) {
    console.error('Failed to read encounter state:', error);
    return null;
  }
}

// Write encounter state to scene metadata
export async function writeEncounterState(state: EncounterState): Promise<void> {
  try {
    await OBR.scene.setMetadata({
      [PLUGIN_STATE_KEY]: state
    });
  } catch (error) {
    console.error('Failed to write encounter state:', error);
    throw error;
  }
}

// Subscribe to encounter state changes
export function subscribeToEncounterState(
  callback: (state: EncounterState | null) => void
): () => void {
  const handleMetadataChange = (metadata: Record<string, unknown>) => {
    const stateData = metadata[PLUGIN_STATE_KEY];
    
    if (!stateData) {
      callback(null);
      return;
    }

    // Basic validation
    if (
      typeof stateData === 'object' && 
      'version' in stateData && 
      'round' in stateData && 
      'phase' in stateData
    ) {
      callback(stateData as EncounterState);
    } else {
      callback(null);
    }
  };

  return OBR.scene.onMetadataChange(handleMetadataChange);
}

// Initialize state if it doesn't exist, otherwise return existing state
export async function getOrInitializeState(): Promise<EncounterState> {
  let state = await readEncounterState();
  
  if (!state) {
    state = initializeEmptyState();
    await writeEncounterState(state);
  }

  return state;
}