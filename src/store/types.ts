// SWADE Initiative Tracker - Core Type Definitions

export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

export type CardId = string; // deterministic id: "AS", "10H", "JK-R", "JK-B"

export interface Card {
  id: CardId;            // deterministic: rank+suit or "JK-R"/"JK-B"
  rank: Rank | 'JOKER';
  suit?: Suit;           // undefined for Jokers
  jokerColor?: 'RED' | 'BLACK'; // defined only when rank==='JOKER'
  label: string;         // e.g., 'A♠', '10♦', 'Red Joker', 'Black Joker'
}

// Note: getCardId function moved to src/deck/cardIds.ts

export interface Deck {
  remaining: CardId[];    // top of deck is end of array (pop)
  inPlay: CardId[];       // cards currently assigned to participants
  discard: CardId[];
  reshuffleAfterRound: boolean; // true if any Joker appeared this round
}

export type ParticipantType = 'PC' | 'NPC' | 'GROUP';

export interface ParticipantRow {
  id: string;                 // row id (distinct from OBR item id)
  name: string;               // display name
  tokenIds: string[];         // OBR item ids represented by this row (image items preferred)
  type: ParticipantType;
  inactive: boolean;
  onHold: boolean;            // carryover hold into subsequent rounds
  revealed: boolean;          // true if visible to players (privacy system)

  // Cards for the current round
  currentCardId?: CardId;     // keeper for this round (optional if holding into new round)
  candidateIds: CardId[];     // drawn this round (includes current if already chosen)
  drewThisRound: boolean;     // for late joiners / skipping duplicates
}

export interface Settings {
  hideNpcFromPlayers: boolean; // global privacy toggle
}

export type Phase = 'setup' | 'between_rounds' | 'cards_dealt' | 'in_round';

export interface ActNowInsertion {
  rowId: string;
  position: 'before' | 'after';
}

export interface EncounterState {
  version: 3;
  round: number;               // 0 before first deal; increments each Deal Round
  phase: Phase;                // 'setup' before first round; 'between_rounds' after End Round; 'in_round' during a round
  deck: Deck;
  rows: Record<string, ParticipantRow>;
  turn: { 
    activeRowId: string | null; 
    actNow?: ActNowInsertion[]; 
  };
  settings: Settings;
  revision: number;           // Increments with each state change, for sync loop detection
}

// Local component state (NOT synced in metadata)
export interface LocalComponentState {
  undoStack: EncounterState[]; // Local undo history (max 10-20)
}