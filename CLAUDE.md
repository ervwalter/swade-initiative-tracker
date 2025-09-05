# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This project uses Yarn as the package manager:

- **Install dependencies**: `yarn`
- **Development server**: `yarn dev`
- **Production build**: `yarn build`
- **Preview build**: `yarn preview`
- **Type checking**: `tsc`

## Project Overview

This is a SWADE Initiative Tracker extension for Owlbear Rodeo, implementing a card-based initiative system using a standard 54-card deck (52 cards + 2 Jokers). The current code is a forked example extension that will be completely refactored to implement the full SWADE system.

## Architecture (Target Implementation)

### Tech Stack
- React + TypeScript + Vite
- Material-UI (MUI) for components
- Owlbear Rodeo SDK v3.1.0 for plugin integration

### Core Systems
- **Card-based Initiative**: 54-card Action Deck with proper SWADE sorting (Jokers → Ace-to-2 → Suit precedence S>H>D>C)
- **Multi-client State Sync**: Scene metadata as single source of truth with last-write-wins conflict resolution
- **Privacy System**: GM can hide NPC cards from players until revealed
- **Hold/Act Now Mechanics**: Complex state management for held actions and mid-round insertions

### Key Data Structures
```typescript
interface EncounterState {
  version: 1;
  round: number;
  phase: 'setup' | 'between_rounds' | 'in_round';
  deck: Deck;
  cards: Record<CardId, Card>;
  rows: Record<string, ParticipantRow>;
  turn: { activeRowId: string | null; actNow?: ActNowInsertion[] };
  settings: Settings;
  undoStack: UndoEntry[];
}
```

## Implementation Roadmap

Following the incremental plan from `swade-design.md`:

1. **P1 - State & Plumbing**: Scene metadata integration, deck system
2. **P2 - Basic UI**: Read-only display with undo framework
3. **P3 - Participants**: Add/remove with token linking
4. **P4 - Deal & Sort**: Core card dealing and SWADE sorting logic
5. **P5 - Turn Navigation**: Prev/Next with privacy auto-reveal
6. **P6 - Hold/Act Now**: Complex hold mechanics with Act Now placement
7. **P7 - Replacement Draws**: Card chooser modal system
8. **P8 - Groups**: Extras grouping (optional in MVP)
9. **P9 - Polish**: UX refinement and undo system

## Key Implementation Files

Target module structure from design:
- `src/state/types.ts` - Core data types
- `src/state/sceneState.ts` - OBR metadata sync
- `src/deck/deck.ts` - Deck operations and shuffle logic
- `src/sort/order.ts` - SWADE sorting algorithms
- `src/components/HeaderBar.tsx` - Main controls
- `src/components/ParticipantList.tsx` - Initiative order display
- `src/components/CardChooser.tsx` - Replacement draw modal
- `src/obr/contextMenu.ts` - Token integration

## Development Guidelines

### SWADE Rules to Implement
- Deck reshuffles after any round containing a Joker
- Initiative order: Jokers (Black > Red) → Ace-to-2 (high-to-low) → Suit (Spades > Hearts > Diamonds > Clubs)
- Hold mechanics: Skip dealing to held participants, allow Act Now re-entry
- Replacement draws: GM chooses keeper from multiple candidates (no automatic best/worst)

### State Management
- Single source of truth in OBR scene metadata
- Last-write-wins for GM conflicts (multiple GMs supported)
- Undo system with bounded snapshot history (default 20 actions)

### Privacy System
- NPC/Group rows completely hidden from players until activated
- Auto-reveal on turn advancement or Act Now
- UI-level privacy only (values in scene metadata)

## Testing Focus

Manual testing in OBR dev room required for:
- Multi-client synchronization
- Privacy behavior with GM/player role switching  
- Turn navigation edge cases
- Card dealing and sorting correctness
- Hold/Act Now complex state transitions

Refer to `swade-design.md` for detailed technical specifications and `swade-prd.md` for user requirements.
- the dev server is always running.  never run `yarn dev` yourself