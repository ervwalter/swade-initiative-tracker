# SWADE Initiative Tracker — State Management Refactor Design

**Version**: 1.0  
**Status**: Ready for implementation  
**Purpose**: Replace manual state management with Zustand + Immer for better DX and reliability

---

## 1) Overview

This supplement to `swade-design.md` proposes refactoring the state management architecture before implementing the UI components. The current approach has several pain points that will compound as we build more components:

### Current Problems:
- **Component-bound state**: All state lives in `InitiativeTracker`, making sharing difficult
- **Manual immutability**: Error-prone deep copying with `deepCopyEncounterState`
- **Prop drilling ahead**: As we add components, state passing will become unwieldy
- **Custom undo complexity**: Rolling our own undo when libraries exist
- **State mutation risks**: Every update requires careful immutability handling

### Proposed Solution:
**Zustand + Immer** provides a lightweight, modern alternative that eliminates these issues while maintaining the same external API surface for OBR metadata synchronization.

---

## 2) New Architecture

### Core Libraries:
- **Zustand**: Lightweight state management (2.2kb gzipped)
- **Immer**: Automatic immutability via structural sharing
- **Custom OBR Storage**: Adapter to sync with scene metadata

### Benefits:
✅ **Eliminate manual deep copying** - Immer handles automatically  
✅ **Global state access** - Any component can subscribe to needed state  
✅ **Selective re-renders** - Components only update when their data changes  
✅ **Better DevTools** - Time-travel debugging and state inspection  
✅ **Simpler testing** - Actions and state can be tested in isolation  
✅ **Future-proof** - Easier to add features like undo/redo middleware

---

## 3) Store Structure

```typescript
interface SwadeStore {
  // State
  encounterState: EncounterState;
  isLoading: boolean;
  error: string | null;
  
  // Computed state (selectors)
  cardsInPlay: () => CardId[];
  participantCards: () => CardId[];
  gameStatus: () => GameStatusSummary;
  
  // Deck actions
  drawCard: () => CardId | null;
  discardCard: (cardId: CardId) => void;
  shuffleDeck: () => void;
  
  // Game actions
  createParticipant: (name: string, type: ParticipantType) => string;
  dealToParticipant: (participantId: string) => CardId | null;
  endRound: () => void;
  
  // System actions
  initializeState: () => Promise<void>;
  reset: () => Promise<void>;
  syncWithOBR: () => Promise<void>;
}
```

---

## 4) OBR Metadata Sync Strategy

### Dual Storage Pattern:
- **Primary**: Local Zustand store (fast, synchronous, supports undo/redo)
- **Secondary**: OBR scene metadata (multi-client sync, debounced writes)

### Store with Sync Logic:
```typescript
const useSwadeStore = create(
  temporal(  // Built-in undo/redo middleware
    immer((set, get) => ({
      // Local state is source of truth for UI
      encounterState: initialState,
      isLoading: false,
      
      // Actions update local state immediately, then sync
      drawCard: () => set((state) => {
        const result = drawCard(state.encounterState.deck);
        queueOBRSync();  // Debounced sync to OBR
        return result;
      }),
      
      // Handle incoming changes from other clients
      syncFromOBR: (externalState) => set((state) => {
        state.encounterState = externalState;
        // Don't queue sync - this IS from OBR
      })
    }))
  )
);
```

### Debounced OBR Sync:
```typescript
// 50ms debounced sync (fast but prevents spam)
const queueOBRSync = debounce(async () => {
  const state = useSwadeStore.getState().encounterState;
  await writeEncounterState(state);
}, 50);

// Listen for external changes (other clients)
useEffect(() => {
  return OBR.scene.onMetadataChange((metadata) => {
    const externalState = metadata[getPluginId('state')];
    if (externalState) {
      useSwadeStore.getState().syncFromOBR(externalState);
    }
  });
}, []);
```

---

## 5) Immer Integration

All state updates become simple "mutations" that Immer converts to immutable updates:

```typescript
// Before (manual deep copying):
drawCard: () => {
  const newState = deepCopyEncounterState(currentState);
  const result = drawCard(newState.deck);
  writeEncounterState(newState);
  return result.cardId;
}

// After (Immer magic):
drawCard: () => set(produce((state) => {
  const result = drawCard(state.encounterState.deck);
  // Immer automatically handles immutability!
  return result.cardId;
}))
```

---

## 6) Component Integration

Components become much simpler:

```typescript
// Before (prop drilling):
function SomeDeepComponent({ onCardDraw, gameState, ... }) {
  // Lots of props passed down
}

// After (direct store access):
function SomeDeepComponent() {
  const { drawCard, cardsInPlay } = useSwadeStore(
    (state) => ({ 
      drawCard: state.drawCard, 
      cardsInPlay: state.cardsInPlay() 
    })
  );
  // Component only re-renders when cardsInPlay changes
}
```

---

## 7) Console Utilities Integration

Console utilities become store actions, removing code duplication:

```typescript
// Expose store actions directly to window
if (import.meta.env.DEV) {
  (window as any).swade = {
    // Direct access to store actions
    ...useSwadeStore.getState(),
    
    // Additional dev utilities
    getStore: () => useSwadeStore.getState(),
    resetStore: () => useSwadeStore.setState(initialState)
  };
}
```

---

## 8) Undo/Redo and Multi-Client Behavior

### Undo/Redo Strategy:
- **Local history**: Each client maintains its own undo stack using `temporal` middleware
- **Sync on undo**: When client undos, the resulting state syncs to all clients (like any change)
- **No undo sync**: We don't sync the undo action itself, just the resulting state
- **Granular by default**: Most actions create undo points, with future refinement for compound actions

```typescript
// Example: Client A undos locally
const { undo } = useSwadeStore.temporal.getState();
undo(); // Reverts local state and triggers queueOBRSync()
// Other clients see the reverted state as a normal update
```

### Multi-GM Policy:
- **Single GM assumption**: Design assumes one active GM at a time
- **Last write wins**: No conflict resolution - if multiple GMs edit, last change wins
- **User education**: Documentation advises "don't have multiple GMs editing simultaneously"
- **Simple conflict handling**: OBR metadata changes overwrite local state completely

### State Change Granularity:
- **Default**: Each user action creates an undo point
- **Future compound actions**: Reserve ability to group related changes (e.g., "Deal Round")
- **Implementation**: Use `temporal.pause()` and `temporal.resume()` for compound operations

---

## 9) Migration Strategy

### Phase 2.5 Implementation Plan:

1. **Install dependencies** and create store structure
2. **Implement OBR storage adapter** with metadata sync
3. **Migrate deck operations** to store actions
4. **Migrate game state operations** (participants, rounds)
5. **Replace console utilities** with store-based actions
6. **Update InitiativeTracker** to use store instead of local state
7. **Remove legacy state management** code
8. **Test multi-client synchronization**

### Backward Compatibility:
- OBR metadata format stays the same
- External API (scene metadata structure) unchanged
- Existing saved games continue to work
- Migration system remains functional

---

## 9) Testing Strategy

### Unit Tests:
- Store actions can be tested in isolation
- Immer updates can be verified for correctness
- OBR adapter can be mocked for testing

### Integration Tests:
- Multi-client sync behavior
- Console utilities still work
- State persistence across refresh
- Migration from legacy format

### Manual Testing:
- Open multiple browser tabs
- Perform actions in one, verify sync in others
- Test undo/redo if implemented
- Verify performance with complex state

---

## 10) Dependencies

### New Package Additions:
```json
{
  "dependencies": {
    "zustand": "^4.4.7",
    "immer": "^10.0.3",
    "zustand-middleware-temporal": "^1.3.1"
  }
}
```

### Bundle Size Impact:
- **Zustand**: ~2.2kb gzipped
- **Immer**: ~12kb gzipped  
- **Total added**: ~14kb (acceptable for the benefits)

---

## 11) Benefits Summary

### Developer Experience:
- ✅ No more manual deep copying
- ✅ Simple state updates with Immer
- ✅ Global state access from any component
- ✅ Better debugging with DevTools
- ✅ Type-safe actions and selectors

### Code Quality:
- ✅ Reduced complexity in components
- ✅ Centralized business logic
- ✅ Easier testing and mocking
- ✅ Less error-prone state updates

### Future Maintainability:
- ✅ Easy to add new features
- ✅ Built-in patterns for complex state
- ✅ Community support and best practices
- ✅ Middleware ecosystem (undo/redo, etc.)

This refactor provides a solid foundation for the remaining UI phases while eliminating the state management pain points we've already encountered.