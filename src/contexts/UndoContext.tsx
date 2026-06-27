// Undo Context Provider
// Provides undo functionality through React context with localStorage persistence

import { useState, useEffect, useMemo, useCallback, useSyncExternalStore, ReactNode } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { store } from '../store/store';
import { setEncounterState } from '../store/swadeSlice';
import { LocalUndoStore } from '../store/localUndoStore';
import { UndoContext, UndoContextValue } from './UndoContextDefinition';

interface UndoProviderProps {
  children: ReactNode;
}

export function UndoProvider({ children }: UndoProviderProps) {
  const [undoStore] = useState(() => new LocalUndoStore());

  // Subscribe React to the undo store as an external mutable source. This keeps
  // undo availability in sync without calling setState inside an effect.
  const subscribe = useCallback(
    (onChange: () => void) => undoStore.subscribe(onChange),
    [undoStore]
  );
  const canUndoState = useSyncExternalStore(subscribe, () => undoStore.canUndo());
  const undoDescription = useSyncExternalStore(subscribe, () =>
    undoStore.getUndoDescription()
  );

  // Initialize room storage on mount (OBR guaranteed ready by PluginGate) and
  // tear down timers/subscribers on unmount. initializeWithRoom emits a change,
  // so the subscriptions above pick up any loaded checkpoints.
  useEffect(() => {
    undoStore.initializeWithRoom(OBR.room.id);
    return () => {
      undoStore.destroy();
    };
  }, [undoStore]);

  // Memoize functions to prevent unnecessary re-renders
  const performUndo = useCallback(() => {
    const currentState = store.getState().swade;
    const undoState = undoStore.getUndoState(currentState.revision);
    
    if (undoState) {
      // Dispatch the restored state with updated revision
      // This will trigger OBR sync to other iframes
      store.dispatch(setEncounterState(undoState));
      console.debug('[Undo] Restored previous state');
    } else {
      console.debug('[Undo] No state to restore');
    }
  }, [undoStore]);

  const captureCheckpoint = useCallback((description: string) => {
    const currentState = store.getState().swade;
    undoStore.captureCheckpoint(currentState, description);
  }, [undoStore]);

  const clearUndoHistory = useCallback(() => {
    undoStore.clearCheckpoints();
  }, [undoStore]);

  const getCheckpointCount = useCallback(() => {
    return undoStore.getCheckpointCount();
  }, [undoStore]);

  const value = useMemo<UndoContextValue>(() => ({
    canUndo: canUndoState,
    undoDescription,
    performUndo,
    captureCheckpoint,
    clearUndoHistory,
    getCheckpointCount
  }), [canUndoState, undoDescription, performUndo, captureCheckpoint, clearUndoHistory, getCheckpointCount]);

  return (
    <UndoContext.Provider value={value}>
      {children}
    </UndoContext.Provider>
  );
}

