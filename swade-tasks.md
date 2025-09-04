# SWADE Initiative Tracker - Implementation Tasks

This file tracks the implementation progress of the SWADE Initiative Tracker extension for Owlbear Rodeo.

Based on the implementation plan from `swade-design.md` with 20 incremental, testable phases.

---

## Phase 1 - State & Metadata Sync ✅ COMPLETE
**Goal**: Set up the foundation for scene metadata synchronization

- [x] Define `EncounterState` interface in `src/state/types.ts`
- [x] Define `Card`, `ParticipantRow`, `Deck` interfaces 
- [x] Define `LocalComponentState` for local undo stack
- [x] Create `getCardId()` helper function for deterministic card IDs
- [x] Implement scene metadata read/write helpers in `src/state/sceneState.ts`
- [x] Set up `onMetadataChange` subscription pattern
- [x] Bootstrap empty state initialization (round=0, phase='setup')
- [x] **Test**: Verify state persists across browser refresh

**Design Reference**: Section 2 (Architecture), Section 3 (Data Model)
**Key Files**: `src/state/types.ts`, `src/state/sceneState.ts`

---

## Phase 2 - Deck System ✅ COMPLETE
**Goal**: Implement card deck operations with deterministic IDs

- [x] Create `src/deck/deck.ts` with deck building functions
- [x] Implement standard 54-card deck generation (52 cards + 2 Jokers)
- [x] Use deterministic card IDs: "AS", "10H", "JK-R", "JK-B", etc.
- [x] Create static `cards` lookup table for rendering
- [x] Implement Fisher-Yates shuffle algorithm
- [x] Add draw card operation (pop from remaining array)
- [x] Add discard operation (push to discard array)
- [x] **Test**: Console commands to draw/shuffle/verify deck state

**Design Reference**: Section 4.1 (Deck init), Section 4.2 (Drawing a card)
**Key Files**: `src/deck/deck.ts`, `src/deck/cardIds.ts`

---

## Phase 2.5 - State Management Refactor ✅ COMPLETE
**Goal**: Migrate from manual state management to Redux Toolkit (RTK)

- [x] Install RTK and React-Redux dependencies (`yarn add @reduxjs/toolkit react-redux`)
- [x] Create `src/store/store.ts` with RTK store configuration
- [x] Create `src/store/swadeSlice.ts` with Redux slice and actions
- [x] Create `src/store/selectors.ts` with memoized selectors
- [x] Create `src/store/obrSync.ts` with OBR metadata sync middleware
- [x] Implement OBR metadata storage adapter for persistence
- [x] Create store actions for deck operations (drawCard, shuffleDeck, etc.)
- [x] Create store actions for game operations (createParticipant, dealTo, endRound)
- [x] Update InitiativeTracker to use Redux hooks instead of local state management
- [x] Remove legacy state management code (`deepCopyEncounterState`, manual state copying)
- [x] Remove console utilities (simplified for cleaner codebase)
- [x] **Test**: Multi-client sync works with RTK store and OBR middleware
- [x] **Test**: State persists across refresh using RTK + OBR metadata
- [x] **Test**: All deck operations work with Immer immutability
- [x] **Code Review**: Completed with fixes for error handling and cleanup

**Design Reference**: `swade-design-state-refactor.md` (updated for RTK)
**Key Files**: `src/store/store.ts`, `src/store/swadeSlice.ts`, `src/store/obrSync.ts`, `src/store/selectors.ts`

---

## Phase 3 - Basic Header UI
**Goal**: Render header with round information (no buttons yet)

- [x] Create `src/components/HeaderBar.tsx` component
- [x] Display "SWADE Initiative" title
- [x] Show current round indicator ("Setup", "Round 1", "Round 3", etc.)
- [x] Connect to scene metadata state for round display
- [x] Style with MUI components for consistency
- [x] **Test**: Header renders correctly, shows current round state

**Design Reference**: Section 6.1 (Header Bar)
**Key Files**: `src/components/HeaderBar.tsx`

---

## Phase 4 - Empty Participant List ✅ COMPLETE
**Goal**: Set up participant list container with empty state

- [x] Create `src/components/ParticipantList.tsx` wrapper component
- [x] Display "No participants added" empty state message
- [x] Set up scrollable container for future participant rows
- [x] Connect to scene metadata for participants data
- [x] Handle empty rows object gracefully
- [x] **Test**: Empty state displays correctly

**Design Reference**: Section 6.2 (Participant List)
**Key Files**: `src/components/ParticipantList.tsx`

---

## Phase 5 - Add Participants (Basic) ✅ COMPLETE
**Goal**: Allow GM to add participants with name and type

- [x] Add "Add Participant" button to HeaderBar (GM only)
- [x] Create simple dialog with Name and Type fields (PC/NPC/GROUP)
- [x] Generate unique row IDs for new participants
- [x] Add participant to `rows` object in scene metadata
- [x] Display participant name in list (no cards yet)
- [x] Check `OBR.player.getRole()` for GM-only access
- [x] **Test**: Can add participants, they appear in list and persist

**Design Reference**: Section 6.3 (Add Participant)
**Key Files**: `src/components/HeaderBar.tsx`, participant dialog component

---

## Phase 6 - Remove Participants
**Goal**: Allow GM to remove participants from initiative

- [x] Create `src/components/ParticipantRow.tsx` for individual row display
- [x] Add Remove button per row (GM only, visible only)
- [x] Implement participant deletion from `rows` object
- [x] Update scene metadata when participant removed
- [x] Handle edge case of removing non-existent participant
- [x] **Test**: Can remove participants, state updates correctly

**Design Reference**: Section 8 (Error Handling - Removing participants)
**Key Files**: `src/components/ParticipantRow.tsx`

---

## Phase 7 - Deal Round ✅ COMPLETE
**Goal**: Deal cards to eligible participants

- [x] Add "Deal Round" button to ControlBar (changes to "Start" when round=0)
- [x] Implement deal round logic: one card per eligible participant
- [x] Skip participants marked as `inactive` or `onHold`
- [x] Update round counter and set phase to 'in_round'
- [x] Set `currentCardId` for each participant who draws
- [x] Display dealt cards in participant rows
- [x] Add error handling for insufficient cards
- [x] **Test**: Cards dealt correctly, displayed in rows

**Design Reference**: Section 4.6 (Deal Round)
**Key Files**: `src/components/ControlBar.tsx`, `src/store/swadeSlice.ts` (dealRound action)

---

## Phase 8 - Card Sorting ✅ COMPLETE
**Goal**: Display participants in correct SWADE initiative order

- [x] Add SWADE sorting logic to selectors (not separate file)
- [x] Implement card scoring: Jokers > Ace-to-2 > Suit priority (S>H>D>C)
- [x] Handle Black Joker > Red Joker precedence
- [x] Sort participants by their current card values in selectParticipants
- [x] ParticipantList automatically shows sorted order
- [x] Detect Jokers and set `reshuffleAfterRound` flag
- [x] Remove cards lookup from state (now static constant)
- [x] **Test**: Correct initiative order (Jokers→A→2, S>H>D>C)

**Design Reference**: Section 4.4 (Sorting order)
**Key Files**: `src/store/selectors.ts` (getCardScore function), `src/deck/cardIds.ts` (static cardsLookup)

---

## Phase 9 - End Round ✅ COMPLETE
**Goal**: End the current round and handle reshuffling

- [x] Add "End Round" button to ControlBar
- [x] Implement end round logic: clear per-round state
- [x] Check `reshuffleAfterRound` flag and reshuffle if needed
- [x] Move all discard cards back to remaining pile when reshuffling
- [x] Clear `candidateIds` arrays, clear `currentCardId`
- [x] Set phase to 'between_rounds'
- [x] Reset `drewThisRound` flags
- [x] Fix round counter double-increment bug
- [x] **Test**: Reshuffle happens correctly after Joker rounds

**Design Reference**: Section 4.7 (End Round)
**Key Files**: `src/components/ControlBar.tsx`, `src/store/swadeSlice.ts` (endRound action)

---

## Phase 10 - Local Undo System
**Goal**: Implement local-only undo functionality

- [ ] Create `src/state/localState.ts` for local undo management
- [ ] Set up local component state for undo stack (max 10-20)
- [ ] Create snapshot function to capture state before changes
- [ ] Add "Undo" button to HeaderBar
- [ ] Implement undo action that restores previous state
- [ ] Ensure undo doesn't affect other clients (local only)
- [ ] **Test**: Can undo last action, doesn't affect other clients

**Design Reference**: Section 2 (Architecture - Undo), Section 11 (Module Plan)
**Key Files**: `src/state/localState.ts`, `src/components/UndoButton.tsx`

---

## Phase 11 - Turn Navigation
**Goal**: Navigate through initiative order with Prev/Next

- [ ] Add "Prev" and "Next" buttons to HeaderBar
- [ ] Implement `activeRowId` tracking in turn state
- [ ] Highlight currently active participant row
- [ ] Navigate through sorted participant order
- [ ] Disable Prev at first row, Next at last row (no wrap-around)
- [ ] Update `turn.activeRowId` in scene metadata
- [ ] **Test**: Navigation works, highlights correct participant

**Design Reference**: Section 4.11 (Turn Navigation)
**Key Files**: `src/components/HeaderBar.tsx`, turn navigation logic

---

## Phase 12 - Hold Toggle
**Goal**: Allow participants to hold their action

- [ ] Add "Hold" toggle button to ParticipantRow
- [ ] Implement `onHold` flag toggle for participants
- [ ] Skip held participants during next Deal Round
- [ ] Add visual indicator (HOLD chip) for held status
- [ ] Maintain held status across rounds until cleared
- [ ] **Test**: Hold carries across rounds correctly

**Design Reference**: Section 4.5 (Hold lifecycle)
**Key Files**: `src/components/ParticipantRow.tsx`

---

## Phase 13 - Act Now
**Goal**: Allow held participants to interrupt turn order

- [ ] Add "Act Now" button for participants with `onHold=true`
- [ ] Implement placement chooser: "After Current" vs "Interrupt Before"
- [ ] Clear `onHold` flag when acting now
- [ ] Add participant to `turn.actNow` array for ordering
- [ ] Handle participants with no current card (show "No card (Act Now)" chip)
- [ ] Support Shift+click for non-default placement
- [ ] **Test**: Proper insertion in turn order

**Design Reference**: Section 4.12 (Act Now)
**Key Files**: `src/components/ParticipantRow.tsx`

---

## Phase 14 - Inactive Toggle
**Goal**: Mark participants as inactive (skip dealing)

- [ ] Add "Inactive" toggle button to ParticipantRow
- [ ] Implement `inactive` flag toggle for participants
- [ ] Skip inactive participants during Deal Round (never deal)
- [ ] Add visual indicator (grayed out appearance)
- [ ] Inactive participants remain visible but don't participate
- [ ] **Test**: Inactive participants skip dealing correctly

**Design Reference**: Section 4.6 (Deal Round - skip inactive)
**Key Files**: `src/components/ParticipantRow.tsx`

---

## Phase 15 - Privacy System
**Goal**: Hide NPC cards from players until revealed

- [ ] Add privacy toggle to HeaderBar (GM only)
- [ ] Implement `hideNpcFromPlayers` setting
- [ ] Hide NPC/Group rows from player view when privacy enabled
- [ ] Auto-reveal NPC rows when they become active
- [ ] Update "Next" button label to "Next & Reveal" when applicable
- [ ] Check player role for view filtering
- [ ] **Test**: Player view hides NPC cards appropriately

**Design Reference**: Section 5.2 (Privacy), Section 4.4.1 (Visibility timing)
**Key Files**: Privacy logic in components

---

## Phase 16 - Replacement Draws
**Goal**: Allow drawing additional cards and choosing keeper

- [ ] Add "Draw Additional Card" button to ParticipantRow
- [ ] Create `src/components/CardChooser.tsx` modal component
- [ ] Show all `candidateIds` as selectable cards
- [ ] Add "Draw Additional" button within chooser modal
- [ ] Implement keeper selection logic
- [ ] Move non-kept cards to discard pile immediately
- [ ] **Test**: Multiple cards drawn, keeper selection works

**Design Reference**: Section 4.8 (Replacement draws)
**Key Files**: `src/components/CardChooser.tsx`

---

## Phase 17 - Late Joiners
**Goal**: Add participants mid-round with immediate cards

- [ ] Modify Add Participant dialog for timing choice
- [ ] Add "Deal now" vs "Join next round" radio buttons
- [ ] Default to "Deal now" when round > 0
- [ ] Draw card immediately for "Deal now" option
- [ ] Insert late joiner into correct sorted position
- [ ] Set `drewThisRound=true` for immediate draws
- [ ] **Test**: Late joiner appears in correct initiative position

**Design Reference**: Section 4.9 (Late joiners)
**Key Files**: Add participant dialog, deal logic

---

## Phase 18 - Context Menu Integration
**Goal**: Add/remove participants via token context menu

- [ ] Create `src/obr/contextMenu.ts` for OBR integration
- [ ] Set up "Add to Initiative" context menu item
- [ ] Filter for IMAGE items on CHARACTER/MOUNT layers
- [ ] Store `{rowId}` in token metadata for reverse lookup
- [ ] Implement "Remove from Initiative" context menu
- [ ] Link tokens to participant rows via `tokenIds` array
- [ ] Default new participants to NPC type
- [ ] **Test**: Token selection creates linked participant

**Design Reference**: Section 7 (Integrations with OBR)
**Key Files**: `src/obr/contextMenu.ts`

---

## Phase 19 - Groups/Extras Support
**Goal**: Allow multiple tokens to share a single initiative card

- [ ] Support multiple `tokenIds` per participant row
- [ ] Add group creation/editing functionality
- [ ] Display member count for GROUP type participants
- [ ] Ensure groups draw only one card total
- [ ] Handle token removal from groups
- [ ] Show group icon indicator
- [ ] **Test**: Groups share single card correctly

**Design Reference**: Section 3 (Data Model - ParticipantRow.tokenIds)
**Key Files**: Group management components

---

## Phase 20 - Polish
**Goal**: Final UX improvements and error handling

- [ ] Add loading states for async operations
- [ ] Implement error boundaries for graceful failure handling
- [ ] Add keyboard shortcuts for common actions
- [ ] Optimize performance for large participant lists
- [ ] Add tooltips and help text where needed
- [ ] Handle edge cases (network interruptions, etc.)
- [ ] Final styling and accessibility improvements
- [ ] **Test**: Smooth UX under various conditions

**Design Reference**: Section 12 (Testing Strategy), Section 14 (Risks & Mitigations)
**Key Files**: All components for final polish

---

## Notes

- Each phase should be completed and tested before moving to the next
- Phases 1-4 establish the foundation (no functionality yet)
- Phases 5-9 implement core initiative mechanics
- Phases 10-17 add advanced features
- Phases 18-20 add integration and polish

## Testing Checklist

- [ ] Unit tests for deck operations (shuffle, draw, discard)
- [ ] Unit tests for SWADE sorting algorithm
- [ ] Integration tests in OBR dev room
- [ ] Privacy behavior verification (GM vs Player views)
- [ ] Hold/Act Now mechanics testing
- [ ] Turn navigation edge cases
- [ ] Multi-client state synchronization
- [ ] Local undo functionality isolation