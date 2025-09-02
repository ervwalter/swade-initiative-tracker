# SWADE Initiative Tracker — Technical Design

Version: 0.1 (draft)
Status: Draft for review
Scope: Implements PRD in `swade-prd.md` with a minimal, analog-feel deck/initiative helper for OBR

---

## 1) Overview

This design turns the PRD into a concrete plan for a lightweight Owlbear Rodeo (OBR) extension that manages SWADE initiative using a single shared Action Deck. It intentionally avoids rules automation and focuses on bookkeeping and clear visibility, matching a physical-table feel.

Key tenets:

- One shared deck per encounter; reshuffle after any round where a Joker appeared.
- Participants are rows (PC, NPC, Group). Groups can represent Extras sharing a single card.
- Sorting is by Joker → rank (A→2) → suit (S>H>D>C). No dice, no Bennies, no automatic “best/worst” picks.
- Hold and Inactive are simple status flags that affect dealing and order.
 - Privacy option: GM can hide NPC rows entirely from player view until they become active (auto-reveal on activation).

---

## 2) Architecture

- UI: React + MUI (existing stack). Components modularized by feature.
- State sync: OBR Scene Metadata under plugin key `rodeo.owlbear.initiative-tracker/state`.
- Token link: OBR Items keep a lightweight tag in Item metadata `rodeo.owlbear.initiative-tracker/metadata` to mark that the token participates and to store the row id link.
- Authority: Single GM assumption (multiple GMs use simple last-write-wins if needed). Players are read-only.
- Persistence: Encounter state persists in scene metadata so all clients see the same deck/initiative status.
- Undo: Local-only (not synced) - each GM maintains their own undo history in component state.
- Privacy: UI-level privacy (values hidden for players) for friendly games.

OBR APIs verified (via installed SDK types v3.1.0):
- `OBR.scene.getMetadata(): Promise<Metadata>` and `OBR.scene.setMetadata(update: Metadata)`; `OBR.scene.onMetadataChange((metadata) => ...)` — scene-scoped shared metadata for all clients in the scene. See `node_modules/@owlbear-rodeo/sdk/lib/api/scene/SceneApi.d.ts:18`.
- `OBR.player.getRole()` and `OBR.player.onChange` — current user role and changes.
- `OBR.party.getPlayers()` and `OBR.party.onChange` — multi-client player list. See `node_modules/@owlbear-rodeo/sdk/lib/api/PartyApi.d.ts:6`.
- `OBR.player.setMetadata(update: Partial<Metadata>)` — available but not used in initial design (players are read-only).
- `OBR.scene.items.updateItems(...)` — for token linking; not central to sync design.

Note: The public docs site was not accessible due to a bot challenge in this environment; the authoritative installed TypeScript definitions were used to ground the API surface.

---

## 3) Data Model

Canonical types (TypeScript-style):

```ts
type Suit = 'S' | 'H' | 'D' | 'C';
type Rank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

type CardId = string; // deterministic id: "AS", "10H", "JK-R", "JK-B"

interface Card {
  id: CardId;            // deterministic: rank+suit or "JK-R"/"JK-B"
  rank: Rank | 'JOKER';
  suit?: Suit;           // undefined for Jokers
  jokerColor?: 'RED' | 'BLACK'; // defined only when rank==='JOKER'
  label: string;         // e.g., 'A♠', '10♦', 'Red Joker', 'Black Joker'
}

// Helper function for card ID generation
function getCardId(rank: Rank | 'JOKER', suit?: Suit, jokerColor?: 'RED' | 'BLACK'): CardId {
  if (rank === 'JOKER') {
    return jokerColor === 'RED' ? 'JK-R' : 'JK-B';
  }
  return `${rank}${suit}`;
}

interface Deck {
  remaining: CardId[];    // top of deck is end of array (pop)
  discard: CardId[];
  reshuffleAfterRound: boolean; // true if any Joker appeared this round
}

type ParticipantType = 'PC' | 'NPC' | 'GROUP';

interface ParticipantRow {
  id: string;                 // row id (distinct from OBR item id)
  name: string;               // display name
  tokenIds: string[];         // OBR item ids represented by this row (image items preferred)
  type: ParticipantType;
  inactive: boolean;
  onHold: boolean;            // carryover hold into subsequent rounds

  // Cards for the current round
  currentCardId?: CardId;     // keeper for this round (optional if holding into new round)
  candidateIds: CardId[];     // drawn this round (includes current if already chosen)
  drewThisRound: boolean;     // for late joiners / skipping duplicates
}

interface Settings {
  hideNpcFromPlayers: boolean; // global privacy toggle
}

type Phase = 'setup' | 'between_rounds' | 'in_round';

interface EncounterState {
  version: 1;
  round: number;               // 0 before first deal; increments each Deal Round
  phase: Phase;                // 'setup' before first round; 'between_rounds' after End Round; 'in_round' during a round
  deck: Deck;
  cards: Record<CardId, Card>; // static deck catalog (built once, deterministic IDs)
  rows: Record<string, ParticipantRow>;
  turn: { activeRowId: string | null; actNow?: { rowId: string; position: 'before' | 'after' }[] };
  settings: Settings;
  // REMOVED: undoStack (now local-only), updatedAt, updatedBy (single GM assumption)
}

// Local component state (NOT synced in metadata)
interface LocalComponentState {
  undoStack: EncounterState[]; // Local undo history (max 10-20)
}
```

Notes:

- “Rows” are the source of truth for per-participant state. Display order is computed on render from current cards (Jokers/Rank/Suit); no persisted order array is stored.
- Cards are drawn by moving ids from `deck.remaining` into a row’s `candidateIds`. When a keeper is selected, non-kept candidates move to `deck.discard` immediately.
- If a Joker is among any row’s candidates for the round, `deck.reshuffleAfterRound = true`.
- Card IDs are deterministic (rank+suit): "AS" = Ace of Spades, "10H" = Ten of Hearts, "JK-R" = Red Joker, "JK-B" = Black Joker. No UUID generation needed.
- Undo system is local-only: each GM client maintains its own undo history in component state, not synced across clients.
- Token art is deferred: initial implementation stores only `tokenIds` for linkage, visual previews added later.

---

## 4) Core Algorithms

4.1 Deck init

- Build a standard 54-card set: 52 suited cards + 2 Jokers with deterministic IDs (e.g., "AS", "10H", "JK-R", "JK-B").
- Create static `cards` lookup table mapping IDs to Card objects for rendering.
- Shuffle using Fisher–Yates with a fresh RNG seed when starting an encounter (or when reshuffling).
- Initial state: `round=0`, `phase='setup'`, `turn.activeRowId=null`, `deck.reshuffleAfterRound=false`. GM can add participants during `setup` without dealing cards.

4.2 Drawing a card

- If `deck.remaining.length === 0`: reshuffle `discard` into `remaining` and continue (even mid-round). Preserve `reshuffleAfterRound` flag if a Joker has already appeared.
- Pop one from `remaining` and append to the row’s `candidateIds`. Mark row `drewThisRound = true`.

4.3 Choosing a keeper

- Set `currentCardId` to the chosen card id.
- Move all other cards from `candidateIds` to `deck.discard`.
- Keep the keeper card id in `candidateIds` (so the chooser UI still shows what was chosen); alternatively, collapse `candidateIds` to `[currentCardId]`.

4.4 Sorting order

- Compute ordering on render only (no persisted order).
- Score each card by tuple: `isJoker desc, jokerColor (BLACK>RED), rankScore desc (A→2), suitScore desc (S>H>D>C)`.
- Include rows that have a `currentCardId`; rows on hold without a card are excluded unless temporarily inserted via Act Now (see 4.12).

Joker nuances:
- Two distinct Jokers exist: Black and Red. Both sort above all other cards. Black Joker sorts ahead of Red Joker (to mirror suit precedence where Spades > Hearts).

4.4.1 Visibility timing (privacy)

- With privacy ON, NPC/Group rows are hidden from players until they become active; at activation they are shown in-place per sorting rules.

4.5 Hold lifecycle

- Toggle `onHold` anytime. During a round, the current card remains visible.
- On End Round:
  - Rows with `onHold=true` keep `onHold=true` and have their `currentCardId` cleared for the next round (so they are listed without a card and are skipped at the next deal).
  - Rows with `onHold=false` remain eligible for the next deal.

4.6 Deal Round

- For each row in `rows`:
  - Skip if `inactive`.
  - Skip if `onHold` (carryover) — do not draw.
  - Clear `candidateIds` and `drewThisRound=false`.
  - Draw one card, set `currentCardId` to that card.
 - If `round===0` (first deal), set `round=1`; else increment by 1. Set `phase='in_round'`.

4.7 End Round

- If `deck.reshuffleAfterRound` is true, shuffle `discard` back into `remaining`, clear flag.
- Clear per-round flags (`drewThisRound=false` for all rows, clear `candidateIds` down to `[currentCardId]`).
- Set `phase='between_rounds'`.

4.8 Replacement draws

- Action: Draw Additional Card → one additional draw into `candidateIds`.
- Chooser UI shows `candidateIds` for that row for this round.
- On keeper selection, move non-kept to discard and set `currentCardId`.
- Edge case: If user hasn’t selected a keeper by End Round, default behavior is to retain the last selected keeper if any, else the initial card; remaining candidates are discarded. No automatic “best/worst” pick.

4.9 Late joiners

- Add Participant → `Deal now` draws a card immediately; the row will appear in the computed order. `Join next round` adds the row without drawing and `drewThisRound=false`.

4.10 (removed) Per-row reveal

Per-row manual reveal is not part of MVP. Privacy is controlled by a single global toggle; rows auto-reveal on activation.

4.11 Turn Navigation

- Pointer: `turn.activeRowId` stores the active row id. When null, no highlight is shown.
- Next: selects the next row in the current computed order (including any Act Now insertions). Disabled when at the last row.
- Prev: selects the previous row in the current computed order. Disabled when at the first row or when null.
- End Round: explicit action; does not occur via `Next` at end-of-list.
- Effects of changes:
  - Removing rows: if the active row is removed, select the next logical row in the computed order; otherwise leave `activeRowId` unchanged.
  - “Act Now”: GM action selects that row to reflect immediate turn.
  - Auto-reveal on activation: Any action that activates a row as the current turn (Next, Prev, or Act Now jump) will show it to players even if privacy is ON.

4.12 Act Now

Context: A row marked `onHold=true` may choose to act immediately (“Act Now”). If they carried hold into a new round, they may have no `currentCardId`.

Placement options (micro-chooser inline on the row):
- After Current (default): display the row immediately after the current active row; select it so they act now. This covers the common case where the current actor finished but `Next` hasn’t been pressed.
- Interrupt Before: display the row immediately before the current active row; select it so they act now. This covers true interrupts (contest/Joker) or when the pointer already advanced.

Behavior:
- Clear `onHold` and select the row (auto-reveal if hidden).
- Add a transient insertion record to `turn.actNow` for this round: `{ rowId, position: 'before' | 'after' }`. Rendering places this row immediately before/after the current active row in the computed list (without changing card-based sort).
- If the row has no `currentCardId`, show a “No card (Act Now)” chip; no draw occurs until the next `Deal Round`.
- After acting, `Next` proceeds according to the merged display order (Act Now insertions take precedence around the active row, then fall back to the card-based order).

UX affordances:
- Micro-chooser: two compact chips (“After Current”, “Interrupt Before”) shown inline near the Act Now button; one click commits. Default is “After Current”.
- Shortcut: Shift+click on Act Now commits the non-default option in one click.
- Optional: brief “Swap placement” toast to flip After⇄Before for a few seconds (confirm if desired).

---

## 5) Privacy and Permissions

5.1 Roles

- GM can modify any row and all global actions.
- Players are read-only in the initial design (no self-management); all actions are GM-only.
- Any GM may perform actions, including turn controls (`Prev`/`Next`/`End Round`/`Deal Round`).
- Undo control: Always present; GM-only global Undo across all actions.

5.2 Privacy

- Global toggle `settings.hideNpcFromPlayers` (default OFF).
- Player view rules:
  - PCs: Always show actual card value.
  - NPC/Extras: When hidden and not yet active, do not appear in the player list at all (no placeholder and no ordering leak). On activation, appear with their actual value in the correct sorted position.
  - No hidden-turn header: We do not render any special header indicator for hidden active rows. See Turn Navigation for auto-reveal rules.
 - Auto-reveal on advance: When the GM advances the turn (`Next`) and the next row is a hidden NPC/Group, the system automatically shows that row before moving the pointer, so players immediately see it highlighted in place. The `Next` button label reflects this (see UI).
- Implementation note: Values are stored in scene metadata and are therefore visible to clients; privacy is a UI affordance, not hard security.

---

## 6) UI/UX

6.1 Header Bar

- Left: Title “SWADE Initiative”.
- Controls (GM only): `Add Participant`, `Deal Round` (or `Start & Deal Round` when `round===0`), `Prev`, `Next`, `End Round`, `End Initiative` (resets to setup), privacy toggle, round indicator (e.g., “Round 3”).
- Navigation semantics: `Prev`/`Next` move a global turn pointer highlight. `Next` is disabled when at the last row; it does not auto-advance to a new round. `End Round` is an explicit action.
 - Dynamic labels: If the next row is a hidden NPC/Group, change `Next` to `Next & Reveal` to communicate the auto-reveal.

6.2 Participant List

- Row contents (visible rows only):
  - Name (+ token preview optional later).
  - Token art: show thumbnail using `Image.image.url` when `tokenIds[0]` is an image item; fallback to initials if absent.
  - Card chip: shows card label; Jokers styled distinctively. If acting via Act Now without a card, show a “No card (Act Now)” chip instead.
  - Status chips: HOLD, INACTIVE, ACT NOW.
  - Actions: Hold toggle, Inactive toggle, Draw Additional Card, Remove, Act Now.
  - Act Now inline micro-chooser: On click, display two chips inline — “After Current” (default) and “Interrupt Before”. Shift+click selects the non-default immediately. No modal.
 - Hidden NPC/Group when privacy is ON and not active: not rendered in the player list (GM still sees all rows).
 - Group rows: show a group icon and count of members (used for Extras groups).
 - Auto-reveal on advance: When GM presses `Next` onto a hidden NPC/Group, that row becomes visible immediately; the highlight anchors to it.

6.3 Add Participant (GM)

- Header button `Add Participant` opens a compact dialog:
  - Fields: Name (required), Type (`PC` | `NPC` | `GROUP`), Tokens (optional; prefilled from current token selection if any), Join timing (`Deal now` | `Join next round`).
  - Defaults: If `round>0` (initiative started), default Join timing = `Deal now`; if `round===0` (setup), default = `Join next round`.
- Behavior: Creates a row linked to zero or more tokens (`tokenIds` may be empty). If `Deal now`, draws and will appear in the computed order; else adds without a card until next deal.
  - Context menu path: `Add to Initiative` on one or more selected tokens adds rows linked to those tokens (default Type = `NPC`; GM can edit). `Remove from Initiative` removes linkage/row.
- Not Extras-specific: Manual add works for any participant type, including PC, NPC-Wild, or an Extras group.

6.4 Card Chooser Modal

- Shows all `candidateIds` as cards.
- Primary action: “Select as Keeper”.
- Secondary: “Draw Additional” (adds one to candidates).

6.5 Accessibility & Fallbacks

- Keyboard focus for action buttons, readable contrast, and concise labels.
- When privacy hides cards, tooltips can note “Hidden from players until their turn”.

---

## 7) Integrations with OBR

- Item Context Menu: Toggle “Add to Initiative” / “Remove from Initiative”
  - Filters: `roles: ["GM"]`, `permissions: ["UPDATE"]`, `every: [ {key: "type", value: "IMAGE"}, {key: "layer", value: "CHARACTER", coordinator: "||"}, {key: "layer", value: "MOUNT"} ]`. “Add” also filters on our plugin metadata key being undefined for clean add.
  - On add: create a row with `tokenIds=[item.id]` (for each selected token or as configured); default `type` to `NPC` (GM can adjust later). Store `{ rowId }` under the item's plugin metadata for reverse lookup.
  - On remove: remove row. If the row had a card, move it to discard; clear the item’s plugin metadata link.
  - Scene Metadata: `rodeo.owlbear.initiative-tracker/state` holds `EncounterState`.
- Multi-client sync pattern (single-GM, players read-only, simple):
  - Single source of truth: `EncounterState` is stored entirely under the plugin key in `scene.metadata`. Local UI always binds directly to this state; there is no divergent local copy.
  - Write path (GM): Use the latest in-memory state from `onMetadataChange`, compute a new state (and local undo snapshot), and call `OBR.scene.setMetadata({...existing, [pluginKey]: newState})`. No additional revisioning needed.
  - Read path (all): Subscribe to `OBR.scene.onMetadataChange` and replace local state wholesale from the plugin key. GM changes fully update all client UIs.
  - Undo: Local-only (not synced) - GM maintains undo history in component state, can revert without affecting other clients.
  - Privacy: No security hardening. Players’ clients may be able to inspect metadata; acceptable by design.

- Item Metadata: `rodeo.owlbear.initiative-tracker/metadata` holds `{ rowId: string }` per token to tie tokens to rows.
- Change Listeners: subscribe to `scene.onMetadataChange` to update local UI reactively. Also subscribe to `scene.items.onChange` to refresh token-derived visuals (name/art/visibility) for linked rows.

---

## 8) Error Handling & Edge Cases

- Deck exhaustion mid-round: reshuffle discard to remaining and continue drawing.
- Duplicate tokens in multiple rows: prevent by validating `tokenIds` uniqueness when adding.
- Rare concurrent edits: simple last-write-wins; local undo allows recovery.
- Missing card after End Round with unresolved chooser: keep previously selected keeper or initial card; discard the rest.
- Joker reshuffle flag: set when any row has a Joker drawn among candidates; applied at End Round.
 - Distinct Jokers: both Black and Red Jokers exist. Black sorts ahead of Red for initiative; both trigger the reshuffle flag when seen.
 - Ending initiative: `End Initiative` moves to `phase='setup'`, resets `round=0`, clears `turn.activeRowId`, `deck.reshuffleAfterRound`, and per-round flags; reinitializes the deck (fresh shuffle). Rows remain for reuse by default; if the GM chooses "Clear all participants," delete rows and unlink any token metadata, and reset privacy/settings to defaults.
 - Removing a participant mid-round: discard `currentCardId` to deck.discard and, if it was the active row, select the next logical row in the computed order; otherwise keep the current selection. Clamp to none if list becomes empty.

---

## 9) Performance

- 40+ rows target: keep sorting efficient (pure function on current cards) and avoid unnecessary metadata writes.
- Keep deck and rows as normalized records; arrays hold stable ids.
- Throttle metadata writes (batch small changes when possible) to avoid excessive network chatter.
- Local undo stacks are bounded by count (10-20 snapshots) to prevent memory growth.

---

## 10) Implementation Plan (Incremental)

**P1 — State & Metadata Sync**
- Define `EncounterState` types (without undo fields)
- Implement scene metadata read/write helpers  
- Subscribe to `onMetadataChange`
- Bootstrap empty state (round=0, phase='setup')
- **Test**: Verify state persists across refresh

**P2 — Deck System**
- Build deck with deterministic IDs (`getCardId` helper)
- Implement shuffle (Fisher-Yates)
- Draw/discard operations
- **Test**: Console commands to draw/shuffle/verify deck state

**P3 — Basic Header UI**
- Render header bar with title "SWADE Initiative"
- Show round indicator (e.g., "Setup" or "Round 3")
- No buttons yet, just display
- **Test**: Header renders, shows correct round

**P4 — Empty Participant List**
- Empty participant list component
- "No participants" message
- List container with proper scrolling setup
- **Test**: Empty state displays correctly

**P5 — Add Participants (Basic)**
- "Add Participant" button in header (GM only)
- Simple dialog: Name + Type (PC/NPC/GROUP)
- Add to state, display in list (name only)
- **Test**: Can add participants, they persist

**P6 — Remove Participants**
- Remove button per row (GM only)
- Delete from state
- **Test**: Can remove, state updates correctly

**P7 — Deal Round**
- "Deal Round" button (changes to "Start & Deal Round" when round=0)
- Deal cards to eligible participants
- Display cards in rows
- **Test**: Cards dealt, displayed correctly

**P8 — Card Sorting**
- Implement SWADE sort order
- Display participants in sorted order
- Joker reshuffle flag detection
- **Test**: Correct order (Jokers→A→2, S>H>D>C)

**P9 — End Round**
- "End Round" button
- Apply reshuffle if needed
- Clear per-round state
- **Test**: Reshuffle happens after Joker round

**P10 — Local Undo System**
- Local undo stack (not synced)
- Undo button in header
- Snapshot before each action
- **Test**: Can undo last action, doesn't affect other clients

**P11 — Turn Navigation**
- Prev/Next buttons
- Active row highlighting
- No wrap-around at list ends
- **Test**: Navigation works, highlights correct row

**P12 — Hold Toggle**
- Hold button per row
- Skip held participants on next deal
- Visual indicator for held status
- **Test**: Hold carries across rounds correctly

**P13 — Act Now**
- Act Now button for held participants
- Before/After placement chooser
- Clear hold and activate
- **Test**: Proper insertion in turn order

**P14 — Inactive Toggle**
- Inactive button per row
- Never deal to inactive
- Visual indicator (greyed out)
- **Test**: Inactive participants skip dealing

**P15 — Privacy System**
- Toggle in header (GM only)
- Hide NPC/Group cards from players
- Auto-reveal on activation
- **Test**: Player view hides appropriately

**P16 — Replacement Draws**
- "Draw Additional Card" button per row
- Card chooser modal
- Select keeper, discard others
- **Test**: Multiple cards, keeper selection works

**P17 — Late Joiners**
- "Deal now" vs "Join next round" option
- Add mid-round with immediate card
- **Test**: Late joiner appears in correct sort position

**P18 — Context Menu Integration**
- "Add to Initiative" on tokens
- "Remove from Initiative"
- Link tokens to rows
- **Test**: Token selection creates participant

**P19 — Groups/Extras Support**
- Group multiple tokens to one row
- Show member count
- **Test**: Groups share single card

**P20 — Polish**
- Loading states
- Error handling
- Keyboard shortcuts
- Performance optimization

---

## 11) Module Plan (Files)

- `src/state/types.ts` — EncounterState, Card, ParticipantRow, LocalComponentState, helpers.
- `src/state/sceneState.ts` — read/write scene metadata, subscriptions (no batching complexity).
- `src/state/localState.ts` — Local undo management hooks/utilities.
- `src/deck/deck.ts` — buildDeck, shuffle, draw, discard, reshuffle with deterministic IDs.
- `src/deck/cardIds.ts` — getCardId helper and card generation utilities.
- `src/sort/order.ts` — SWADE sorting and ordering logic.
- `src/components/HeaderBar.tsx` — header controls and round info.
- `src/components/UndoButton.tsx` — undo control using local state.
- `src/components/ParticipantList.tsx` — list wrapper.
- `src/components/ParticipantRow.tsx` — row UI with actions.
- `src/components/CardChooser.tsx` — replacement draw modal.
- `src/obr/contextMenu.ts` — add/remove participants, token linking.
- Migrate existing `InitiativeTracker.tsx` to orchestrate new components.

---

## 12) Testing Strategy

- Unit tests (pure logic): deck ops, sorting, hold/deal lifecycle.
- Manual integration in OBR dev room for single-GM sync and privacy behavior.
- Scenarios from PRD Acceptance Tests mapped to test checklists.
- Turn navigation tests: pointer increments/decrements without wrap; `Next` disabled at last row; End Round is explicit and separate.
- Start/End tests: `Deal Round` from `round=0` starts Round 1; `End Initiative` resets to setup without removing rows; Add Participant default Join timing flips appropriately based on `round`.
 - Removal tests: Removing a participant during setup unlinks tokens; during an active round discards the current card, and adjusts the active pointer and display order correctly.
 - End Initiative options: Verify default keeps participants; optional “Clear all participants” removes rows and unlinks tokens; deck reinitialized.
 - Auto-reveal tests: when activation (Next, Prev, or Act Now) targets a hidden NPC/Group, the system shows it and the button label shows `Next & Reveal` for Next before the action; after action, the row is visible and highlighted.
 - Act Now tests:
  - After Current: insertion displays immediately after the current active row; pointer moves to inserted row; no draw if no card; chip renders.
  - Interrupt Before: insertion displays immediately before the current active row; pointer moves to inserted row; original current becomes next; no draw if no card; chip renders.
  - Shift+click selects non-default.
  - Optional swap toast flips placement.
- Undo tests: sequential actions can be undone in reverse order; undo reverts deck, rows, active pointer, and privacy flags accurately. Local undo does not affect other clients.
- Single-GM tests: verify state syncs properly to player clients; player view updates when GM makes changes.

---

## 13) Open Decisions / Confirmations

1) Privacy behavior — DECIDED: NPC/Group rows are hidden from players until they become active; on activation, they appear in their correct sorted position. (PRD delta; see below.)
2) Unresolved replacement chooser at End Round: This design keeps the initial (or last selected) card and discards others—no auto “best/worst”. Confirm acceptable.
3) Permissions model: Players are read-only for MVP; all actions are GM-only. Single GM assumption. Confirmed.
4) Simplifications — DECIDED for MVP: Removed per-row `ownerId`, persistent `audit` log, `updatedAt/updatedBy` tracking, and synced undo. Local undo provides recovery without metadata overhead.

PRD delta (acceptance test update suggestion):
 - Replace PRD §10.7 with: “With privacy ON, GM sees all card faces; players do not see NPC/Group rows until they are active. On activation, the row appears to players with full value in the correct sorted position.”
 - Replace PRD §7 (US7 — Permissions) AC with: “Players have read-only views; GM can modify any row and all settings.”
 - Replace PRD §9 Configuration ‘Allow player self-management’ with: “Players read-only in MVP (setting disabled).”

---

## 14) Risks & Mitigations

- Privacy is UI-only: Acceptable for friendly game table etiquette.
- Single GM assumption: Rare multi-GM edge cases use simple last-write-wins; local undo allows recovery.
- Grouping UX complexity: Start with simple "Add to group" flow; defer drag-and-drop sorting.

---

## 15) Out of Scope (MVP)

- Bennies, Joker’s Wild payouts, dice automation.
- Rules adjudication for edges/hindrances.
- Rich token previews, comprehensive audit UI beyond minimal log.

---
