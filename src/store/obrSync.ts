// OBR Metadata Synchronization for RTK Store
import { createListenerMiddleware, isAnyOf, type ListenerMiddlewareInstance } from '@reduxjs/toolkit';
import OBR from '@owlbear-rodeo/sdk';
import { writeEncounterState } from '../state/sceneState';
import { getPluginId } from '../getPluginId';
import { isValidStateStructure, migrateState } from '../state/migrations';
import { 
  drawCard, 
  discardCard, 
  shuffleDeck, 
  endRound, 
  createParticipant, 
  dealRound,
  reset,
  setEncounterState 
} from './swadeSlice';
import type { RootState } from './store';

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Setup OBR synchronization
export function setupOBRSync(listenerMiddleware: ListenerMiddlewareInstance) {
  // Create debounced sync function
  const debouncedSync = debounce(async (state: RootState['swade']) => {
    try {
      await writeEncounterState(state);
      console.log('[OBR] Synced to metadata:', {
        round: state.round,
        phase: state.phase,
        participants: Object.keys(state.rows).length,
        deckRemaining: state.deck.remaining.length
      });
    } catch (error) {
      console.error('[OBR] Failed to sync to metadata:', error);
      // TODO: Consider showing user notification for sync failures
      // For now, we'll rely on the next successful action to resync
    }
  }, 50);

  // Listen for actions that should trigger OBR sync
  listenerMiddleware.startListening({
    matcher: isAnyOf(
      drawCard,
      discardCard,
      shuffleDeck,
      endRound,
      createParticipant,
      dealRound,
      reset
      // Note: setEncounterState is NOT included - it comes FROM OBR
    ),
    effect: (action: any, listenerApi: any) => {
      const state = listenerApi.getState().swade;
      debouncedSync(state);
    }
  });

  console.log('[OBR] Sync listeners configured');
}

// Subscribe to external OBR changes (call once during app initialization)
export function subscribeToOBRChanges(store: { dispatch: (action: any) => void }) {
  const PLUGIN_STATE_KEY = getPluginId('state');
  
  console.log('[OBR] Setting up metadata change subscription...');
  
  const unsubscribe = OBR.scene.onMetadataChange((metadata) => {
    const stateData = metadata[PLUGIN_STATE_KEY];
    
    if (!stateData) {
      console.log('[OBR] No state data in metadata');
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
        store.dispatch(setEncounterState(migratedState));
        console.log('[OBR] External state update received and applied');
      } catch (error) {
        console.error('[OBR] Failed to process external state update:', error);
        // Continue using current state - don't break the app
      }
    } else {
      console.warn('[OBR] Invalid state structure in metadata, ignoring update');
    }
  });

  console.log('[OBR] Metadata change subscription active');
  return unsubscribe;
}