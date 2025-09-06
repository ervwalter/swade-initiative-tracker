// Local Undo Store - NOT synced to OBR metadata
// Manages checkpoint stack for undo functionality with localStorage persistence

import type { EncounterState } from './types';

interface UndoCheckpoint {
  state: EncounterState;
  description: string;
  timestamp: number;
}

export class LocalUndoStore {
  private checkpoints: UndoCheckpoint[] = [];
  private maxCheckpoints = 20;
  private currentRoomId: string | null = null;
  private storageKeyPrefix = 'swade-undo-';
  
  // Cleanup configuration
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // Daily cleanup
  private readonly MAX_AGE = 90 * 24 * 60 * 60 * 1000; // 90 days retention
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Don't initialize room tracking in constructor - wait for explicit call
  }

  /**
   * Initialize with room ID and load existing checkpoints
   * Called after OBR is ready
   */
  initializeWithRoom(roomId: string): void {
    try {
      this.currentRoomId = roomId;
      this.loadCheckpointsFromStorage();
      this.scheduleCleanup();
      console.log(`[Undo] Initialized for room: ${this.currentRoomId}`);
    } catch (error) {
      console.warn('[Undo] Could not initialize room storage:', error);
      this.currentRoomId = 'default';
      this.loadCheckpointsFromStorage();
    }
  }

  /**
   * Schedule periodic cleanup of old room data
   */
  private scheduleCleanup(): void {
    // Run cleanup immediately on initialization
    this.cleanupOldRoomData();
    
    // Schedule daily cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldRoomData();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Clean up old room data (90+ days old) from localStorage
   */
  private cleanupOldRoomData(): void {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      
      // Iterate through all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(this.storageKeyPrefix)) continue;
        
        // Skip current room
        if (key === this.getStorageKey()) continue;
        
        try {
          const data = localStorage.getItem(key);
          if (!data) {
            keysToRemove.push(key);
            continue;
          }
          
          const checkpoints = JSON.parse(data) as UndoCheckpoint[];
          if (!Array.isArray(checkpoints) || checkpoints.length === 0) {
            keysToRemove.push(key);
            continue;
          }
          
          // Check age of most recent checkpoint
          const mostRecent = checkpoints[checkpoints.length - 1];
          if (!mostRecent?.timestamp || (now - mostRecent.timestamp) > this.MAX_AGE) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // Remove corrupted data
          keysToRemove.push(key);
        }
      }
      
      // Remove old/corrupted entries
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
      
      if (keysToRemove.length > 0) {
        console.log(`[Undo] Cleaned up ${keysToRemove.length} old room entries`);
      }
    } catch (error) {
      console.warn('[Undo] Error during cleanup:', error);
    }
  }

  /**
   * Get localStorage key for current room
   */
  private getStorageKey(): string {
    return `${this.storageKeyPrefix}${this.currentRoomId || 'default'}`;
  }

  /**
   * Load checkpoints from localStorage for current room
   */
  private loadCheckpointsFromStorage(): void {
    if (!this.currentRoomId) return;

    try {
      const stored = localStorage.getItem(this.getStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.checkpoints = parsed;
          console.log(`[Undo] Loaded ${this.checkpoints.length} checkpoints from localStorage for room ${this.currentRoomId}`);
        }
      }
    } catch (error) {
      console.warn('[Undo] Failed to load checkpoints from localStorage:', error);
      this.checkpoints = [];
    }
  }

  /**
   * Save checkpoints to localStorage for current room with quota handling
   */
  private saveCheckpointsToStorage(): void {
    if (!this.currentRoomId) return;

    try {
      const data = JSON.stringify(this.checkpoints);
      localStorage.setItem(this.getStorageKey(), data);
    } catch (error) {
      const isQuotaError = error instanceof DOMException && 
        (error.name === 'QuotaExceededError' || 
         error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
         error.code === 22);
         
      if (isQuotaError) {
        console.warn('[Undo] Storage quota exceeded, reducing checkpoint count');
        
        // Try progressively smaller checkpoint counts
        const attempts = [15, 10, 5, 2];
        for (const maxCount of attempts) {
          try {
            this.checkpoints = this.checkpoints.slice(-maxCount);
            localStorage.setItem(this.getStorageKey(), JSON.stringify(this.checkpoints));
            console.log(`[Undo] Reduced to ${maxCount} checkpoints to fit storage`);
            // Don't permanently reduce maxCheckpoints - let it recover when storage is available
            return;
          } catch (retryError) {
            console.debug(`[Undo] Retry with ${maxCount} checkpoints failed:`, retryError);
            continue;
          }
        }
        
        // If all attempts fail, clear checkpoints for this session
        console.error('[Undo] Cannot save even minimal checkpoints, clearing history');
        this.checkpoints = [];
      } else {
        console.error('[Undo] Failed to save checkpoints to localStorage:', error);
      }
    }
  }

  /**
   * Capture a checkpoint of the current state
   * Skips capture if revision hasn't changed (no-op actions)
   */
  captureCheckpoint(state: EncounterState, description: string): void {
    const latestCheckpoint = this.checkpoints[this.checkpoints.length - 1];
    
    // Skip if no changes (revision unchanged)
    if (latestCheckpoint && latestCheckpoint.state.revision === state.revision) {
      console.log('[Undo] Skipping checkpoint - no state changes');
      return;
    }

    // Skip rapid duplicates (same description within 50ms)
    const now = Date.now();
    if (latestCheckpoint && 
        latestCheckpoint.description === description &&
        (now - latestCheckpoint.timestamp) < 50) {
      console.log('[Undo] Skipping checkpoint - rapid duplicate');
      return;
    }
    
    // Create deep clone of state to prevent mutations
    const checkpointState = JSON.parse(JSON.stringify(state)) as EncounterState;
    
    this.checkpoints.push({
      state: checkpointState,
      description,
      timestamp: now
    });
    
    // Trim to max size
    if (this.checkpoints.length > this.maxCheckpoints) {
      this.checkpoints.shift();
    }
    
    // Save to localStorage
    this.saveCheckpointsToStorage();
    
    console.log(`[Undo] Captured checkpoint: ${description} (revision ${state.revision})`);
  }

  /**
   * Get state to restore on undo, with updated revision
   * Returns the most recent checkpoint and removes it from stack
   */
  getUndoState(currentRevision: number): EncounterState | null {
    if (this.checkpoints.length < 1) {
      return null; // Need at least 1 checkpoint to undo
    }
    
    // Get the most recent checkpoint (captured BEFORE the last action)
    const checkpointToRestore = this.checkpoints.pop();
    if (!checkpointToRestore) {
      return null;
    }
    
    // Clone the checkpoint state
    const undoState = JSON.parse(JSON.stringify(checkpointToRestore.state)) as EncounterState;
    
    // CRITICAL: Update revision to be newer than current for sync system
    undoState.revision = currentRevision + 1;
    
    console.log(`[Undo] Restoring to: ${checkpointToRestore.description} (updating revision from ${checkpointToRestore.state.revision} to ${undoState.revision})`);
    
    // Save updated checkpoint stack to localStorage
    this.saveCheckpointsToStorage();
    
    return undoState;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    // We need at least 1 checkpoint since we capture BEFORE actions
    return this.checkpoints.length > 0;
  }

  /**
   * Get description of what will be undone
   */
  getUndoDescription(): string | null {
    if (this.checkpoints.length < 1) {
      return null;
    }
    
    // Return description of the most recent checkpoint (what we would restore to)
    const latestCheckpoint = this.checkpoints[this.checkpoints.length - 1];
    return latestCheckpoint ? latestCheckpoint.description : null;
  }

  /**
   * Clear all checkpoints (for testing or reset)
   */
  clearCheckpoints(): void {
    this.checkpoints = [];
    this.saveCheckpointsToStorage();
    console.log('[Undo] Cleared all checkpoints');
  }

  /**
   * Get current checkpoint count (for debugging)
   */
  getCheckpointCount(): number {
    return this.checkpoints.length;
  }

  /**
   * Cleanup resources (call on component unmount)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Note: No longer exporting singleton - instances created by React Context