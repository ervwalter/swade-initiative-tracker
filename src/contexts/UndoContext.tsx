// Undo Context Provider
// Provides undo functionality through React context with localStorage persistence

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import OBR from '@owlbear-rodeo/sdk';
import { store } from '../store/store';
import { setEncounterState } from '../store/swadeSlice';
import { LocalUndoStore } from '../store/localUndoStore';

interface UndoContextValue {
  canUndo: boolean;
  undoDescription: string | null;
  performUndo: () => void;
  captureCheckpoint: (description: string) => void;
  clearUndoHistory: () => void;
  getCheckpointCount: () => number;
}

const UndoContext = createContext<UndoContextValue | null>(null);

interface UndoProviderProps {
  children: ReactNode;
}

export function UndoProvider({ children }: UndoProviderProps) {
  const [undoStore] = useState(() => new LocalUndoStore());
  const [canUndoState, setCanUndoState] = useState(false);
  const [undoDescription, setUndoDescription] = useState<string | null>(null);

  // Initialize room ID when component mounts (OBR guaranteed ready by PluginGate)
  useEffect(() => {
    undoStore.initializeWithRoom(OBR.room.id);
    
    // Initial state update
    setCanUndoState(undoStore.canUndo());
    setUndoDescription(undoStore.getUndoDescription());
  }, [undoStore]);

  // Subscribe to Redux store changes to update undo availability reactively
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setCanUndoState(undoStore.canUndo());
      setUndoDescription(undoStore.getUndoDescription());
    });
    
    return unsubscribe;
  }, [undoStore]);

  // Cleanup on unmount
  useEffect(() => {
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
      console.log('[Undo] Restored previous state');
    } else {
      console.log('[Undo] No state to restore');
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

/**
 * Hook to access undo functionality
 * Must be used within UndoProvider
 */
export function useUndo(): UndoContextValue {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
}