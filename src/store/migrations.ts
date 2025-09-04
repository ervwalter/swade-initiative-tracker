// SWADE Initiative Tracker - State Migration System

import { EncounterState } from "./types";

// Define the current schema version
export const CURRENT_STATE_VERSION = 3;

// Type for raw state data (could be any version)
type RawStateData = Record<string, any>;

// Migration function signature with better type safety
type MigrationFunction = (state: RawStateData) => RawStateData;

// Define all migrations in order
const MIGRATIONS: Record<number, MigrationFunction> = {
  // Migration from version 1 to 2: Add inPlay array to deck
  2: (state: RawStateData): RawStateData => {
    console.log('[MIGRATION] Upgrading state from v1 to v2: Adding deck.inPlay array');
    
    if (state.deck && !Array.isArray(state.deck.inPlay)) {
      state.deck.inPlay = [];
    }
    
    state.version = 2;
    return state;
  },
  
  // Migration from version 2 to 3: Remove cards lookup from state (now static)
  3: (state: RawStateData): RawStateData => {
    console.log('[MIGRATION] Upgrading state from v2 to v3: Removing cards lookup from state');
    
    if (state.cards) {
      delete state.cards;
    }
    
    state.version = 3;
    return state;
  }
  
  // Future migrations go here:
  // 4: (state) => { /* migration logic */ state.version = 4; return state; }
};

/**
 * Migrate state data from any old version to the current version
 */
export function migrateState(rawState: RawStateData): EncounterState {
  if (!rawState || typeof rawState !== 'object') {
    throw new Error('Invalid state data for migration');
  }

  let currentState = { ...rawState };
  const startVersion = currentState.version || 1;
  
  console.log(`[MIGRATION] State version: ${startVersion}, target: ${CURRENT_STATE_VERSION}`);
  
  // Apply migrations in sequence from current version to target
  for (let version = startVersion + 1; version <= CURRENT_STATE_VERSION; version++) {
    const migration = MIGRATIONS[version];
    if (migration) {
      console.log(`[MIGRATION] Applying migration to version ${version}`);
      currentState = migration(currentState);
    } else {
      console.warn(`[MIGRATION] No migration defined for version ${version}`);
    }
  }
  
  // Ensure version is set correctly
  currentState.version = CURRENT_STATE_VERSION;
  
  // Ensure revision exists (for states created before revision support)
  if (typeof currentState.revision !== 'number') {
    currentState.revision = 0;
    console.log('[MIGRATION] Added missing revision field');
  }
  
  if (startVersion < CURRENT_STATE_VERSION) {
    console.log(`[MIGRATION] Successfully upgraded state from v${startVersion} to v${CURRENT_STATE_VERSION}`);
  }
  
  return currentState as EncounterState;
}

/**
 * Validate that state has the minimum required structure
 */
export function isValidStateStructure(rawState: RawStateData): boolean {
  return (
    typeof rawState === 'object' &&
    rawState !== null &&
    'round' in rawState &&
    'phase' in rawState &&
    'deck' in rawState &&
    'rows' in rawState
  );
}

/**
 * Check if state needs migration
 */
export function needsMigration(rawState: RawStateData): boolean {
  const version = rawState?.version || 1;
  return version < CURRENT_STATE_VERSION;
}

/**
 * Get state version (defaults to 1 for legacy states)
 */
export function getStateVersion(rawState: RawStateData): number {
  return rawState?.version || 1;
}