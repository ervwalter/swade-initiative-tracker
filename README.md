# SWADE Initiative Tracker for Owlbear Rodeo

A card-based initiative tracker extension for Savage Worlds Adventure Edition (SWADE) games in Owlbear Rodeo. This extension manages initiative using a standard 54-card deck, following SWADE's unique card-based initiative system.

![Example](/public/docs/header.jpg)

## Overview

This extension brings SWADE's action card initiative system to Owlbear Rodeo, providing:
- **Automated card dealing and sorting** following SWADE rules
- **Shared view** for GMs and players with privacy controls
- **Hold and interrupt mechanics** for tactical combat
- **Token integration** for quick combatant management
- **Undo system** for mistake correction

The design philosophy is to feel like a shared deck at a physical table, removing only the logistical pain while preserving the tactile, analog feel of SWADE combat.

## Features

### Core Initiative System
- **54-card Action Deck**: Standard deck with 2 Jokers, automatically shuffled and managed
- **SWADE Sorting**: Proper initiative order (Jokers → Ace to 2, with suit precedence: Spades > Hearts > Diamonds > Clubs)
- **Automatic Reshuffling**: Deck reshuffles after any round containing a Joker
- **Round Management**: Deal cards, start round, navigate turns, end round workflow

### Combatant Management
- **Multiple Combatant Types**: PCs, NPCs, and Extras (groups)
- **Token Integration**: Add combatants directly from map tokens via context menu
- **Avatar Support**: Displays token images in the initiative order
- **Late Joiners**: Add combatants mid-round with automatic card dealing
- **Incapacitated State**: Mark combatants as inactive without removing them

### Tactical Combat Features
- **Hold Actions**: Combatants can hold their action across rounds
- **Act Now**: Held combatants can interrupt to act before or after the current turn
- **Lose Turn**: Handle Shaken/Stunned status for held combatants
- **Card Replacement**: Draw additional cards and choose which to keep (for Edges like Quick/Level Headed)

### GM Controls
- **Privacy Mode**: Hide NPC cards from players until their turn
- **Manual Card Selection**: Click on any card to manage replacements
- **Full Authority**: GM can modify any combatant's state
- **Bulk Actions**: Remove all NPCs/Extras or perform full reset
- **End Initiative**: Reset the encounter while preserving combatant list

### Player Features
- **Read-Only View**: Players see the initiative order and their cards
- **Privacy Respect**: NPCs remain hidden when privacy mode is enabled
- **Clear Turn Indicators**: Active combatant is highlighted
- **Initiative Status**: Shows current round and deck status

### Quality of Life
- **Undo System**: Local undo with checkpoints for all actions
- **Persistent State**: Initiative survives page refreshes via scene metadata
- **Multi-Client Sync**: All connected clients see the same state
- **Theme Support**: Adapts to Owlbear Rodeo's light/dark themes
- **Responsive Design**: Works in both popover and modal views

## Installation

The extension is available in the Owlbear Rodeo extension store. Search for "SWADE Initiative Tracker" and add it to your room.

## Usage

### Getting Started
1. **Open the extension** from the Owlbear Rodeo extensions panel
2. **Add combatants** using either:
   - The "Add Combatant" button in the header
   - Right-clicking tokens on the map and selecting "Add as PC/NPC/Extra"
3. **Deal cards** by clicking "Deal Cards" to start initiative
4. **Navigate turns** using Previous/Next buttons during combat
5. **End round** when all combatants have acted

### GM Controls

#### Privacy Mode
Toggle the eye icon in the header to enable privacy mode. When active:
- NPCs are hidden from players by default
- NPCs are automatically revealed when their turn comes up
- Individual NPCs can be manually revealed/hidden

#### Managing Cards
- Click on any combatant's card to open the card chooser
- Draw additional cards for Quick/Level Headed edges
- Select which card to keep (GM decides based on table discussion)
- Undo last draw if needed

#### Hold Mechanics
- Active combatants can go on hold (hand icon)
- Held combatants keep their card and aren't dealt new ones
- Held combatants can "Act Now" to interrupt (arrow icons)
- Shaken/Stunned combatants can "Lose Turn" (ban icon)

### Player View
Players have a read-only view showing:
- The current initiative order (respecting privacy settings)
- Their own cards and status
- The active combatant
- Round and deck information

## Technical Details

### Architecture
- **Frontend**: React 18 with TypeScript and Material-UI
- **State Management**: Redux Toolkit with Immer for immutability
- **Persistence**: Owlbear Rodeo scene metadata (single source of truth)
- **Sync Strategy**: Last-write-wins for GM conflicts
- **Undo System**: Local checkpoint-based undo with localStorage

### Data Model
The extension maintains a single `EncounterState` in scene metadata containing:
- **Deck state**: Remaining cards, in-play cards, discard pile
- **Combatant list**: Array of participants with cards and status
- **Round tracking**: Current round number and phase
- **Turn state**: Active combatant and Act Now queue
- **Settings**: Privacy mode and other preferences

### Key Components
- `InitiativeTracker.tsx`: Main application container
- `HeaderBar.tsx`: Title, round info, and GM controls
- `ParticipantList.tsx`: Sorted initiative order display
- `ParticipantRow.tsx`: Individual combatant with actions
- `ControlBar.tsx`: Deal, navigation, and round controls
- `CardChooserModal.tsx`: Interface for replacement draws
- `store/swadeSlice.ts`: Redux actions and state logic
- `store/selectors.ts`: Memoized selectors for derived state

## Development

### Prerequisites
- Node.js 18+
- Yarn package manager

### Setup
```bash
# Install dependencies
yarn

# Run development server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview

# Type checking
yarn tsc
```

### Project Structure
```
src/
├── components/        # React components
├── store/            # Redux state management
├── utils/            # Helper functions
├── contexts/         # React contexts (undo system)
├── hooks/            # Custom React hooks
└── getPluginId.ts    # OBR plugin ID helper
```

### Testing
Manual testing in Owlbear Rodeo development rooms is required for:
- Multi-client synchronization
- Token context menu integration
- Privacy mode behavior
- Card dealing and sorting correctness
- Hold/Act Now state transitions

## License

GNU GPLv3

## Attribution

- **Original Initiative Tracker**: [Owlbear Rodeo](https://github.com/owlbear-rodeo/initiative-tracker)
- **Icon**: Spade symbol from [Phosphor Icons](https://phosphoricons.com/)
- **SWADE System**: [Pinnacle Entertainment Group](https://peginc.com/savage-settings/savage-worlds/)

## Contributing

This is a fork of the original Owlbear Rodeo initiative tracker, extensively modified for SWADE-specific functionality. Issues and pull requests are welcome.

### Copyright
- Copyright (C) 2023 Owlbear Rodeo (original initiative tracker)
- Copyright (C) 2024 ervwalter (SWADE modifications)