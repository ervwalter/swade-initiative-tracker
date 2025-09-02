// Scene metadata synchronization for SWADE Initiative Tracker

import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import { EncounterState, ParticipantRow, Card, CardId } from "./types";
import { generateAllCardIds, buildCardsLookup } from "../deck/cardIds";
import { createShuffledDeck } from "../deck/deck";
import { migrateState, isValidStateStructure, CURRENT_STATE_VERSION } from "./migrations";

const PLUGIN_STATE_KEY = getPluginId("state");

// Note: Card building functions moved to src/deck/cardIds.ts

// Initialize empty encounter state
export function initializeEmptyState(): EncounterState {
  const allCardIds = generateAllCardIds();
  const shuffledDeck = createShuffledDeck(allCardIds);
  
  return {
    version: CURRENT_STATE_VERSION,
    round: 0,
    phase: 'setup',
    deck: {
      remaining: shuffledDeck.remaining,
      inPlay: [],
      discard: shuffledDeck.discard,
      reshuffleAfterRound: false
    },
    cards: buildCardsLookup(),
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

    // Validate basic structure
    if (isValidStateStructure(stateData)) {
      // Apply any necessary migrations
      return migrateState(stateData);
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