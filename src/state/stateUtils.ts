// Utility functions for state management

import { EncounterState } from "./types";

/**
 * Create a deep copy of encounter state for safe mutations
 * Uses structured approach instead of JSON.parse/stringify for better performance and reliability
 */
export function deepCopyEncounterState(state: EncounterState): EncounterState {
  return {
    ...state,
    deck: {
      ...state.deck,
      remaining: [...state.deck.remaining],
      inPlay: [...state.deck.inPlay],
      discard: [...state.deck.discard]
    },
    cards: { ...state.cards }, // Static lookup, shallow copy is fine
    rows: Object.fromEntries(
      Object.entries(state.rows).map(([id, row]) => [
        id,
        {
          ...row,
          tokenIds: [...row.tokenIds],
          candidateIds: [...row.candidateIds]
        }
      ])
    ),
    turn: {
      ...state.turn,
      actNow: state.turn.actNow ? [...state.turn.actNow] : undefined
    },
    settings: { ...state.settings }
  };
}

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