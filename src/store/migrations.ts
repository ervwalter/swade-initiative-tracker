// SWADE Initiative Tracker - State Migration System

import { EncounterState } from "./types";

// Define the current schema version
export const CURRENT_STATE_VERSION = 1;

// Type for raw state data (could be any version)
type RawStateData = Record<string, unknown>;

// Migration function signature with better type safety
type MigrationFunction = (state: RawStateData) => RawStateData;

// Define all migrations in order
const MIGRATIONS: Record<number, MigrationFunction> = {
  // Future migrations go here when needed for released versions
};

/**
 * Migrate state data from any old version to the current version
 */
export function migrateState(rawState: RawStateData): EncounterState {
  if (!rawState || typeof rawState !== 'object') {
    throw new Error('Invalid state data for migration');
  }

  const currentState = { ...rawState };
  const startVersion = (currentState.version as number) || 1;
  
  console.log(`[MIGRATION] State version: ${startVersion}, target: ${CURRENT_STATE_VERSION}`);
  
  // Apply migrations in sequence from current version to target
  for (let version = startVersion + 1; version <= CURRENT_STATE_VERSION; version++) {
    const migration = MIGRATIONS[version];
    if (migration) {
      console.log(`[MIGRATION] Applying migration to version ${version}`);
      migration(currentState);
    } else {
      console.warn(`[MIGRATION] No migration defined for version ${version}`);
    }
  }
  
  // Ensure version is set correctly
  (currentState as { version: number }).version = CURRENT_STATE_VERSION;
  
  // Ensure revision exists (for states created before revision support)
  if (typeof (currentState as { revision?: number }).revision !== 'number') {
    (currentState as { revision: number }).revision = 0;
    console.log('[MIGRATION] Added missing revision field');
  }
  
  if (startVersion < CURRENT_STATE_VERSION) {
    console.log(`[MIGRATION] Successfully upgraded state from v${startVersion} to v${CURRENT_STATE_VERSION}`);
  }
  
  return currentState as unknown as EncounterState;
}

/**
 * Validate that state has the minimum required structure
 */
export function isValidStateStructure(rawState: unknown): rawState is RawStateData {
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
  const version = (rawState?.version as number) || 1;
  return version < CURRENT_STATE_VERSION;
}

/**
 * Get state version (defaults to 1 for legacy states)
 */
export function getStateVersion(rawState: RawStateData): number {
  return (rawState?.version as number) || 1;
}