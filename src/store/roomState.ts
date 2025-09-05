// Room metadata synchronization for SWADE Initiative Tracker

import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../getPluginId";
import { EncounterState, ParticipantRow, Card, CardId } from "./types";
import { generateAllCardIds } from "../utils/cardIds";
import { migrateState, isValidStateStructure, CURRENT_STATE_VERSION } from "./migrations";

const PLUGIN_STATE_KEY = getPluginId("state");

// Note: Card building functions moved to src/utils/cardIds.ts

// Initialize empty encounter state
export function initializeEmptyState(): EncounterState {
  const allCardIds = generateAllCardIds();
  
  // Fisher-Yates shuffle
  const shuffled = [...allCardIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return {
    version: CURRENT_STATE_VERSION,
    round: 0,
    phase: 'setup',
    deck: {
      remaining: shuffled,
      inPlay: [],
      discard: [],
      reshuffleAfterRound: false
    },
    rows: [],
    turn: {
      activeRowId: null
    },
    settings: {
      hideNpcFromPlayers: true
    },
    revision: 0
  };
}

// Read encounter state from room metadata
export async function readEncounterState(): Promise<EncounterState | null> {
  try {
    const metadata = await OBR.room.getMetadata();
    const stateData = metadata[PLUGIN_STATE_KEY];
    
    if (!stateData || typeof stateData !== 'object') {
      return null;
    }

    // Validate basic structure
    if (isValidStateStructure(stateData)) {
      // Apply any necessary migrations
      const migratedState = migrateState(stateData);
      console.log('[OBR] Raw state revision:', (stateData as EncounterState).revision ?? 'undefined');
      console.log('[OBR] Migrated state revision:', migratedState.revision);
      return migratedState;
    }

    return null;
  } catch (error) {
    console.error('Failed to read encounter state:', error);
    return null;
  }
}

// Write encounter state to room metadata
export async function writeEncounterState(state: EncounterState): Promise<void> {
  try {
    await OBR.room.setMetadata({
      [PLUGIN_STATE_KEY]: state
    });
  } catch (error) {
    console.error('Failed to write encounter state:', error);
    throw error;
  }
}

// Clear encounter state from room metadata entirely
export async function clearEncounterState(): Promise<void> {
  try {
    await OBR.room.setMetadata({
      [PLUGIN_STATE_KEY]: undefined
    });
    console.log('[OBR] Cleared encounter state from room metadata');
  } catch (error) {
    console.error('Failed to clear encounter state:', error);
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

  return OBR.room.onMetadataChange(handleMetadataChange);
}

// Initialize state if it doesn't exist, otherwise return existing state
export async function getOrInitializeState(): Promise<EncounterState> {
  let state = await readEncounterState();
  
  if (!state) {
    console.log('[OBR] No existing state found, creating new state');
    state = initializeEmptyState();
    await writeEncounterState(state);
  } else {
    console.log('[OBR] Found existing state with revision:', state.revision);
  }

  return state;
}