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

## Phase 10 - Turn Navigation ✅ COMPLETE
**Goal**: Navigate through initiative order with Prev/Next

- [x] Add "Prev" and "Next" buttons to ControlBar (not HeaderBar)
- [x] Implement `activeRowId` tracking in turn state
- [x] Highlight currently active participant row
- [x] Navigate through sorted participant order (excludes Jokers)
- [x] Disable Prev at first row, Next at last row (no wrap-around)
- [x] Update `turn.activeRowId` in scene metadata
- [x] Add cards_dealt phase and startRound action for proper workflow
- [x] Auto-activate highest non-Joker participant when starting round
- [x] Implement consistent sorting for participants without cards (type + alphabetical)
- [x] Fix ControlBar height consistency to prevent scrollbar flash
- [x] **Test**: Navigation works, highlights correct participant

**Design Reference**: Section 4.11 (Turn Navigation)
**Key Files**: `src/components/ControlBar.tsx`, `src/store/selectors.ts`, `src/store/swadeSlice.ts`

---

## Phase 11 - Hold Toggle ✅ COMPLETE
**Goal**: Allow participants to hold their action

- [x] Add "Hold" toggle button to ParticipantRow (PanToolIcon, visible when active)
- [x] Implement `onHold` flag toggle for participants (using existing setHold action)
- [x] Skip held participants during next Deal Round (already implemented)
- [x] Add visual indicator - PanToolIcon replaces card display when held
- [x] Maintain held status across rounds until cleared
- [x] Update sorting to prioritize held participants (after Jokers, before regular cards)
- [x] Update navigation to skip held participants (like Jokers)
- [x] **Test**: Hold carries across rounds correctly, proper sorting and navigation

**Design Reference**: Section 4.5 (Hold lifecycle), SWADE rules for Hold mechanics
**Key Files**: `src/components/ParticipantRow.tsx`, `src/store/selectors.ts`, `src/store/swadeSlice.ts`

---

## Phase 12 - Act Now ✅ COMPLETE
**Goal**: Allow held participants to interrupt turn order

- [x] Add "Act Now" buttons for participants with `onHold=true` or Jokers (when not active)
- [x] Implement placement chooser: SubdirectoryArrowRightIcon (before) vs TurnRightIcon (after)
- [x] Clear `onHold` flag when acting now (using existing insertActNow action)
- [x] Add participant to `turn.actNow` array for ordering (existing logic)
- [x] Handle Jokers and held participants without cards (both get Act Now buttons)
- [x] Add "Lose Turn" button (BlockIcon) for held participants to handle Shaken/Stunned
- [x] Implement two-row layout: Name/Card on top, action buttons on bottom
- [x] Use faded grayscale icons with hover activation
- [x] **Test**: Proper insertion in turn order, Hold/Act Now workflow

**Design Reference**: Section 4.12 (Act Now), SWADE rules for Hold interruption, Foundry VTT UX patterns
**Key Files**: `src/components/ParticipantRow.tsx`, `src/store/swadeSlice.ts` (loseHold action)

---

## Phase 13 - Inactive Toggle ✅ COMPLETE
**Goal**: Mark participants as inactive (skip dealing)

- [x] Add "Inactive" toggle button to ParticipantRow
- [x] Implement `inactive` flag toggle for participants
- [x] Skip inactive participants during Deal Round (never deal)
- [x] Add visual indicator (grayed out appearance)
- [x] Inactive participants remain visible but don't participate
- [x] **Test**: Inactive participants skip dealing correctly

**Design Reference**: Section 4.6 (Deal Round - skip inactive)
**Key Files**: `src/components/ParticipantRow.tsx`

---

## Phase 14 - Privacy System ✅ COMPLETE
**Goal**: Hide NPC cards from players until revealed

- [x] Add privacy toggle to HeaderBar (GM only)
- [x] Implement `hideNpcFromPlayers` setting
- [x] Hide NPC/Group rows from player view when privacy enabled
- [x] Auto-reveal NPC rows when they become active
- [x] ~~Update "Next" button label to "Next & Reveal" when applicable~~ (Removed per user feedback)
- [x] Check player role for view filtering
- [x] **Test**: Player view hides NPC cards appropriately
- [x] **Bonus**: Redesigned Add Participant dialog with +PC/+NPC/+Group buttons

**Design Reference**: Section 5.2 (Privacy), Section 4.4.1 (Visibility timing)
**Key Files**: `src/components/HeaderBar.tsx`, `src/store/selectors.ts`, `src/components/ParticipantList.tsx`, `src/components/AddParticipantModal.tsx`

---

## Phase 15 - Replacement Draws ✅ COMPLETE
**Goal**: Allow drawing additional cards and choosing keeper

- [x] ~~Add "Draw Additional Card" button to ParticipantRow~~ (Alternative: Click on card chips to open modal)
- [x] Create `src/components/CardChooserModal.tsx` modal component
- [x] Show all `candidateIds` as selectable cards
- [x] Add "Draw Additional" button within chooser modal
- [x] Implement keeper selection logic
- [x] Move non-kept cards to discard pile immediately
- [x] Add "Undo Last Draw" functionality for card management
- [x] Restrict card replacement to GM only and cards_dealt phase only
- [x] Resort participants after card selection to maintain initiative order
- [x] Create shared card styling utility (`src/utils/cardStyles.ts`)
- [x] **Test**: Multiple cards drawn, keeper selection works

**Design Reference**: Section 4.8 (Replacement draws)
**Key Files**: `src/components/CardChooserModal.tsx`, `src/utils/cardStyles.ts`

**Implementation Notes**: Used modal approach instead of inline buttons for better UX. Card replacement accessible by clicking on card chips in participant rows.

---

## Phase 15.5 - End Initiative Feature ✅ COMPLETE
**Goal**: Add ability to reset encounter while preserving participants

- [x] Add "End Initiative" button to ControlBar (appears during between_rounds phase)
- [x] Implement `endInitiative` Redux action that preserves participants but resets deck/round
- [x] Reset deck to fresh shuffled state (all 54 cards)
- [x] Reset round counter to 0 and phase to 'setup'  
- [x] Clear all participant card states (currentCardId, candidateIds, holds)
- [x] Reset NPC/Group privacy based on hideNpcFromPlayers setting
- [x] Position button to avoid accidental clicks (before Deal Cards button)
- [x] Style consistently with End Round button (outlined with StopIcon)
- [x] **Test**: Participants preserved, deck/round reset correctly

**Key Files**: `src/components/ControlBar.tsx`, `src/store/swadeSlice.ts`

---

## Phase 15.6 - UI/UX Improvements ✅ COMPLETE
**Goal**: Various user experience enhancements

- [x] Update header text: "Not Active" instead of "Not Started"
- [x] Update button text: "Start Initiative" for initial setup phase
- [x] Make participant names non-selectable to prevent accidental text selection
- [x] Convert Add Participant from popover to modal for consistency
- [x] Update Add Participant icon to FaUserPlus with "Add Combatant Manually" tooltip
- [x] Extract shared Fisher-Yates shuffle utility to eliminate code duplication
- [x] Optimize CSS performance by moving baseStyle object outside function calls
- [x] Fix misleading modal comments about resizing capabilities

**Key Files**: `src/components/HeaderBar.tsx`, `src/components/ControlBar.tsx`, `src/components/ParticipantRow.tsx`, `src/components/AddParticipantModal.tsx`, `src/store/swadeSlice.ts`, `src/utils/cardStyles.ts`

---

## Phase 16 - Late Joiners ✅ COMPLETE
**Goal**: Add participants mid-round with immediate cards

- [x] Remove dealNow parameter - make automatic based on phase
- [x] Auto-deal cards when added during `in_round` phase
- [x] No cards dealt during `setup` or `between_rounds` phases  
- [x] Remove card manipulation restrictions (GM can replace cards anytime)
- [x] Simplify API - no timing choice UI needed
- [x] Insert late joiner into correct sorted position
- [x] Set `drewThisRound=true` for immediate draws
- [x] **Test**: Late joiner appears in correct initiative position

**Design Reference**: Section 4.9 (Late joiners)
**Key Files**: `src/store/swadeSlice.ts`, `src/components/ParticipantRow.tsx`, `src/contextMenu.ts`, `src/components/AddParticipantModal.tsx`

**Implementation Notes**:
- Removed `dealNow` parameter from `createParticipant` action for cleaner API
- Automatic behavior: participants added during `in_round` phase get cards immediately
- GMs can now click cards to replace them at any time (not just during `cards_dealt` phase)
- Simplified all participant creation points to use consistent interface

---

## Phase 17 - Context Menu Integration ✅ COMPLETE
**Goal**: Add/remove participants via token context menu

- [x] Create `src/contextMenu.ts` for OBR integration (simplified location)
- [x] Set up context menu items: "Add as PC", "Add as NPC", "Add as Extra"
- [x] Filter for IMAGE items on CHARACTER/MOUNT layers (GM-only access)
- [x] Implement separate context menus for each participant type
- [x] Handle plural forms based on token selection count (min/max filters)
- [x] Link tokens to participant rows via `tokenIds` array 
- [x] Smart name inference: prioritize user text labels, fallback to token names
- [x] Use Redux store.dispatch directly (no global dispatch pattern)
- [x] Automatic participant sorting after creation
- [x] **Test**: Token context menu creates participants correctly

**Design Reference**: Section 7 (Integrations with OBR)
**Key Files**: `src/contextMenu.ts`

**Implementation Notes**: 
- Used separate context menus for PC/NPC/Extra instead of smart detection for clearer UX
- Context menu stays open by design (OBR behavior) but functionality works correctly
- Each token becomes separate participant (no grouping in this phase)
- Removed header menu "Remove All NPCs/Extras" and "Full Reset" options added

---

## Phase 18 - Local Undo System
**Goal**: Implement local-only undo functionality with checkpoint capture at user interactions

- [ ] Create `src/store/localUndoStore.ts` for local checkpoint storage
- [ ] Create `src/utils/undo.ts` helper functions
- [ ] Create `src/components/UndoButton.tsx` with tooltip
- [ ] Add checkpoints before all user actions that modify state
- [ ] Add undo button to HeaderBar with keyboard shortcut (Ctrl+Z)
- [ ] Handle revision increment when restoring states for proper sync
- [ ] **Test**: Undo works for all actions, syncs properly across iframes

**Design Reference**: Explicit checkpoint capture pattern
**Key Files**: `src/store/localUndoStore.ts`, `src/utils/undo.ts`, `src/components/UndoButton.tsx`

---

## Phase 19 - Polish
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
- Phases 10-16 add advanced features
- Phases 17-18 add integration features
- Phases 19-20 add undo system and polish

## Testing Checklist

- [ ] Unit tests for deck operations (shuffle, draw, discard)
- [ ] Unit tests for SWADE sorting algorithm
- [ ] Integration tests in OBR dev room
- [ ] Privacy behavior verification (GM vs Player views)
- [ ] Hold/Act Now mechanics testing
- [ ] Turn navigation edge cases
- [ ] Multi-client state synchronization
- [ ] Local undo functionality isolation