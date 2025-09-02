// Local state management for SWADE Initiative Tracker
// Handles undo functionality that is NOT synced across clients

import { useState, useCallback } from 'react';
import { EncounterState } from './types';
import { deepCopyEncounterState } from './stateUtils';

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
    // Deep copy the state to avoid reference issues
    const stateCopy = deepCopyEncounterState(state);
    
    setUndoStack(prev => {
      const newStack = [...prev, stateCopy];
      
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