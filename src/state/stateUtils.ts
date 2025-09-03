// Utility functions for state management

import { EncounterState } from "./types";

// deepCopyEncounterState removed - RTK with Immer handles immutability automatically

/**
 * Validate that a state object has the expected structure
 */
export function isValidEncounterState(obj: any): obj is EncounterState {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.version === 'number' &&
    typeof obj.round === 'number' &&
    typeof obj.phase === 'string' &&
    obj.deck &&
    Array.isArray(obj.deck.remaining) &&
    Array.isArray(obj.deck.inPlay) &&
    Array.isArray(obj.deck.discard) &&
    typeof obj.deck.reshuffleAfterRound === 'boolean' &&
    obj.cards &&
    typeof obj.cards === 'object' &&
    obj.rows &&
    typeof obj.rows === 'object' &&
    obj.turn &&
    obj.settings &&
    typeof obj.settings === 'object'
  );
}