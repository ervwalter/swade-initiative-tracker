import { useContext } from 'react';
import { UndoContext, UndoContextValue } from '../contexts/UndoContextDefinition';

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