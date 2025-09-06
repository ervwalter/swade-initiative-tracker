// Undo Context Definition
// React context definition for undo functionality

import { createContext } from 'react';

export interface UndoContextValue {
  canUndo: boolean;
  undoDescription: string | null;
  performUndo: () => void;
  captureCheckpoint: (_description: string) => void;
  clearUndoHistory: () => void;
  getCheckpointCount: () => number;
}

export const UndoContext = createContext<UndoContextValue | null>(null);