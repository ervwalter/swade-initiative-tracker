// OBR Room Metadata Synchronization for RTK Store
import type { Store, Unsubscribe } from '@reduxjs/toolkit';
import OBR from '@owlbear-rodeo/sdk';
import { writeEncounterState, readEncounterState, getOrInitializeState, initializeEmptyState } from './roomState';
import { getPluginId } from '../getPluginId';
import { isValidStateStructure, migrateState } from './migrations';
import { setEncounterState } from './swadeSlice';
import type { EncounterState } from './types';
import type { RootState } from './store';

// Debounce utility
function debounce(
  func: (state: EncounterState) => Promise<void>,
  wait: number
): (state: EncounterState) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (state: EncounterState) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(state), wait);
  };
}


// Setup OBR synchronization using state subscription
export function setupOBRSync(store: Store<RootState>): Unsubscribe {
  let previousState = store.getState().swade;

  // Create debounced sync function
  const debouncedSync = debounce(async (state: EncounterState) => {
    try {
      // Treat null/undefined as 0 for backwards compatibility
      const revision = state.revision ?? 0;
      
      // Check if OBR room metadata already has this revision (avoid redundant writes)
      const currentOBRState = await readEncounterState();
      const currentOBRRevision = currentOBRState?.revision ?? 0;
      
      if (currentOBRRevision >= revision) {
        console.debug('[OBR] Skipping sync - OBR has newer/same revision:', currentOBRRevision, 'vs', revision);
        return;
      }
      
      await writeEncounterState(state);
      console.debug('[OBR] Synced to room metadata:', {
        round: state.round,
        phase: state.phase,
        participants: state.rows.length,
        deckRemaining: state.deck.remaining.length,
        revision: revision
      });
    } catch (error) {
      console.error('[OBR] Failed to sync to room metadata:', error);
    }
  }, 50);

  // Subscribe to state changes
  const unsubscribe = store.subscribe(() => {
    const currentState = store.getState().swade;
    
    // Skip if state reference hasn't changed (Redux immutability)  
    if (currentState === previousState) {
      return;
    }

    // Sync the new state
    debouncedSync(currentState);
    previousState = currentState;
  });

  console.debug('[OBR] State subscription sync configured');
  return unsubscribe;
}

// Subscribe to external OBR changes (call once during app initialization)
export function subscribeToOBRChanges(store: Store<RootState>): () => void {
  const PLUGIN_STATE_KEY = getPluginId('state');
  
  console.debug('[OBR] Setting up room metadata change subscription...');
  
  // Load initial state
  getOrInitializeState().then(state => {
    console.debug('[OBR] Initial state loaded:', {
      round: state.round,
      phase: state.phase,
      participantCount: state.rows.length,
      deckRemaining: state.deck.remaining.length,
      revision: state.revision
    });
    store.dispatch(setEncounterState(state));
  }).catch(error => {
    console.error('[OBR] Failed to initialize state:', error);
  });
  
  
  const unsubscribe = OBR.room.onMetadataChange(async (metadata) => {
    const stateData = metadata[PLUGIN_STATE_KEY];
    
    if (!stateData) {
      console.debug('[OBR] No state data in room metadata - metadata was cleared, resetting to empty state');
      // When metadata is cleared (e.g., by GM reset), initialize fresh state locally
      // Don't write to OBR metadata here to avoid infinite loop
      const emptyState = initializeEmptyState();
      store.dispatch(setEncounterState(emptyState));
      return;
    }

    // Validate and migrate state data
    if (
      typeof stateData === 'object' && 
      stateData !== null &&
      isValidStateStructure(stateData)
    ) {
      try {
        const migratedState = migrateState(stateData);
        
        // Skip if this is our own write bouncing back or older data
        // Treat null/undefined as 0 for backwards compatibility
        const incomingRevision = migratedState.revision ?? 0;
        const currentRevision = store.getState().swade.revision ?? 0;
        
        if (incomingRevision <= currentRevision) {
          console.debug('[OBR] Ignoring stale/duplicate update (incoming:', incomingRevision, 'current:', currentRevision, ')');
          return;
        }
        
        // Process the external update
        store.dispatch(setEncounterState(migratedState));
        console.debug('[OBR] External state update received and applied');
        
      } catch (error) {
        console.error('[OBR] Failed to process external state update:', error);
        // Continue using current state - don't break the app
      }
    } else {
      console.warn('[OBR] Invalid state structure in room metadata, ignoring update');
    }
  });

  console.debug('[OBR] Room metadata change subscription active');
  return unsubscribe;
}