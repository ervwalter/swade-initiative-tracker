// Local state management for SWADE Initiative Tracker
// Handles undo functionality that is NOT synced across clients

import { useState, useCallback } from 'react';
import { EncounterState } from './types';
// Note: deepCopyEncounterState removed - not needed with RTK/Immer

const MAX_UNDO_STACK_SIZE = 20;

export interface UndoState {
  canUndo: boolean;
  undo: () => EncounterState | null;
  pushUndoSnapshot: (state: EncounterState) => void;
  clearUndoStack: () => void;
}

// Custom hook for managing local undo state
export function useUndoState(): UndoState {
  const [undoStack, setUndoStack] = useState<EncounterState[]>([]);

  const canUndo = undoStack.length > 0;

  const undo = useCallback((): EncounterState | null => {
    if (undoStack.length === 0) {
      return null;
    }

    const previousState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    return previousState;
  }, [undoStack]);

  const pushUndoSnapshot = useCallback((state: EncounterState) => {
    // Note: RTK handles immutability, so we can store state directly
    // (though this undo system is not currently used with RTK)
    setUndoStack(prev => {
      const newStack = [...prev, state];
      
      // Limit stack size
      if (newStack.length > MAX_UNDO_STACK_SIZE) {
        return newStack.slice(-MAX_UNDO_STACK_SIZE);
      }
      
      return newStack;
    });
  }, []);

  const clearUndoStack = useCallback(() => {
    setUndoStack([]);
  }, []);

  return {
    canUndo,
    undo,
    pushUndoSnapshot,
    clearUndoStack
  };
}