# PRD — Owlbear Rodeo Extension: SWADE Initiative (Just-Enough)

## 1) Product Vision
Create a **minimal, analog-feeling initiative helper** for Savage Worlds Adventure Edition (SWADE) games in Owlbear Rodeo (OBR).  
It should **behave like a shared deck at a physical table**, while removing only the logistical pain: deal, sort, hold, simple replacement draws, late joiners, and an optional GM privacy mode.  
**No dice automation. No Bennies tracking. No rules enforcement beyond card order and deck state.**

---

## 2) Goals & Non-Goals
### 2.1 Goals
- **Manage the Action Deck** (single shared deck per encounter; discard; reshuffle after Joker).
- **Deal initiative** at the start of each round.
- **Sort order correctly**: Ace high to Two; tie by **Spades > Hearts > Diamonds > Clubs**; **Jokers at the top**, act anytime.
- **Hold bookkeeping**: mark a unit On Hold; they keep their current card for the rest of that round, **aren’t dealt** at the next round’s deal if still holding, and can **Act Now** to re-enter.
- **Inactive/Incapacitated flag**: unit remains listed but **does not draw**.
- **Simple replacement draw**: a **Draw Additional Card** button; show *all* cards drawn this round for that unit; the owner **picks the keeper** (table decides best/worst).
- **Late joiners**: add mid-round (deal now) or join next round (no card yet).
- **Light permissions (MVP)**: **GM can change anyone**; players have a **read-only** view.
- **Optional GM privacy**: Non-player (GM-controlled) cards are **hidden from players until revealed** (GM sees all).

### 2.2 Non-Goals
- No Bennies ledger, Joker’s Wild payouts, Conviction, damage, or status automation.
- No dice rolls or opposed-check facilitators.
- No automatic interpretation of edges/hindrances (the **table** decides which card to keep).

---

## 3) Rules Basis (what we mirror, not enforce)
- **One 54-card Action Deck** (two Jokers).  
- **Deal each round**; **shuffle after any round with a Joker** seen.  
- **Countdown**: Ace → Two; ties by **S > H > D > C**.  
- **Jokers**: act anytime; (+2 reminders may be displayed, but not applied).  
- **Hold**: may delay within the round; **if still holding into the next round, don’t get a new card**; when you act, you re-enter the order; after acting normally, you’ll be dealt at the next round start again.  
- **Extras may share a card** (grouped row).

> *Design intent:* keep the extension “bookkeeping-only,” with reminders that resemble table chatter, not a rules engine.

---

## 4) Personas
- **GM Gina (primary)**: Wants deck handling, clean order, quick **Hold**/**Act Now**, optional hidden NPC cards, and authority to fix anything.
- **Player Priya**: Wants to clearly see the current order and her card; read-only (communicates requests to the GM).

---

## 5) User Stories & Acceptance Criteria

### US1 — Deal & Sort
**As a GM**, I click **Deal Round** to give one card to every eligible participant and auto-sort the order.  
**AC:**
- Wild Cards draw individually; Extras may be grouped to one shared row.
- Sorted Ace→Two; suit tiebreaker S>H>D>C; Jokers pinned at top.
- If any Joker is dealt this round, a **“reshuffle at round end”** flag appears.

### US2 — Hold (bookkeeping only)
**As a GM**, I can **toggle Hold** on a participant.  
**AC:**
- When set during a round, the card remains visible for that round; the row is marked **On Hold**.
- On the next **Deal Round**, **On Hold rows are skipped** (no new card).
- **Act Now** inserts the row back into the current countdown (table handles any contest off-tool).
- Clearing Hold restores normal dealing on subsequent rounds.

### US3 — Inactive / Incapacitated
**As a GM**, I can mark a participant **Inactive** while keeping them listed.  
**AC:**
- Inactive rows are clearly greyed.
- Inactive rows **never draw** until reactivated.

### US4 — Replacement Draw (simple & universal)
**As a GM**, I can press **Draw Additional Card** to add one more card to a participant’s choices.  
**AC:**
- Each press draws exactly **one** additional card into a **Card Chooser**.
- The chooser shows the **initial card** plus all **additional** cards drawn this round for that row.
- The **GM selects the keeper** after the table decides; non-kept cards go to **discard**.
- No automatic “best/worst” enforcement—**table decides**.

### US5 — Late Joiners & Groups
**As a GM**, I can add a participant mid-combat.  
**AC:**
- Options: **Deal now** (immediate card) or **Join next round** (no card yet).
- I can **group Extras** to a single row; group draw yields one card for the group.

### US6 — GM Privacy Mode (Hidden NPC Cards)
**As a GM**, I can keep non-player cards hidden from players.  
**AC:**
- Setting: **NPC/GM-controlled cards are hidden from players**; GM sees values.
- Player view does **not** show unrevealed NPC rows at all; when revealed, they appear in the correct sorted position with full value.
- Optional per-row **Reveal** control for the GM.

### US7 — Permissions (MVP update)
**As a GM**, I control the encounter; **players** have read-only views.  
**AC (MVP):**
- **Players**: cannot modify rows; view-only (including privacy effects).
- **GM**: can modify any row; add/remove/group rows; override keeper; set Inactive; toggle privacy mode; deal/end round; navigate turns.

---

## 6) Functional Requirements

### 6.1 Deck Management
- Single **Action Deck** per encounter: `remaining[]`, `discard[]`, `reshuffleFlag:boolean`.
- **Reshuffle** happens automatically at **End Round** if any Joker was seen.
- All non-kept replacement cards are moved to **discard** immediately.

### 6.2 Participants & Grouping
- Participant types: `PC`, `NPC-Wild`, `Extras-Group`.
- A **group** holds 1..N tokens but **one card** per round.
- **Inactive** flag removes a row from dealing without removing it from the list.

### 6.3 Dealing & Sorting
- **Deal Round** gives 1 card to each **eligible** row:  
  - Skips rows with `status=Inactive`.  
  - Skips rows with `status=OnHold` (carryover).  
- Sorting: **Joker(s)** at top (acts anytime) → **rank** (A high to 2) → **suit** (S>H>D>C).

### 6.4 Hold Lifecycle
- `Hold` toggle adds a **HOLD** badge but **does not remove** the current card mid-round.
- At next dealing phase, held rows are **not dealt** and show **no card** (still holding).
- `Act Now` clears Hold and reinserts the row into the current round’s order (GM places appropriately).

### 6.5 Replacement Draws
- Action: **Draw Additional Card** (press to open a dialog showing possible card choices, +1 button to draw an additional card in that UI).
- The GM can review all current choices for that row this round and select a single keeper (after table discussion).
- Non-kept cards are moved to **discard**.

### 6.6 Late Joiners
- GM can **Add Participant** → choose **Deal now** or **Join next round**.
- **Remove** keeps the deck intact; removed card (if any) → discard.

### 6.7 Privacy (GM View vs Player View)
- Global setting: **Hide NPC cards from players** (default OFF).
- **GM view** always shows actual cards and full order.
- **Player view** shows:  
  - PCs: actual cards.  
  - NPCs: hidden until revealed; on reveal, show full value in correct sorted position.
- GM can **Reveal** any individual NPC card at will.

### 6.8 Permissions
- Ownership per row (GM assignable).
- Players have read-only views in MVP; all actions are GM-only.
- All actions are applied by the GM and mirrored to all clients.

---

## 7) Notes

- Detailed UI, data modeling, and state-flow design have been moved to `swade-design.md`.

## 8) Non-Functional Requirements

* **Simplicity**: <= 2 clicks for GM to start/deal each round.
* **Clarity**: Clear visuals and concise status indicators.
* **Reliability**: Single shared state source; GM is authoritative.
* **Performance**: Handle 40+ rows (large encounters) without perceptible lag.
* **Auditability**: Minimal action log: deal, replacement choice, hold toggle, reveal.

---

## 9) Configuration (MVP)

* **Privacy**: “Hide NPC cards from players” (default OFF).
* **Player self-management**: OFF (players read-only in MVP).
* **GM override**: always available.

---

## 10) Acceptance Tests

1. **Deal & Sort**

   * Given 3 PCs, 1 NPC-Wild, 2 Extras grouped → after **Deal Round**: each eligible row has 1 card; order is Joker → rank (A→2) → suit (S>H>D>C).

2. **Joker Reshuffle Flag**

   * When any Joker appears, **reshuffleAfterRound** flag is set; on **End Round**, deck shuffles and flag clears.

3. **Hold Across Rounds**

   * If the GM toggles **Hold** on a PC mid-round, they keep their card for the rest of that round.
   * If still holding at **End Round**, they are **not dealt** at the next **Deal Round**; their row shows **no card** but remains **On Hold**.
   * **Act Now** reinserts them; subsequent rounds deal normally if not holding.

4. **Inactive Rows**

   * Marking a row **Inactive** prevents it from receiving cards on **Deal Round** while keeping it visible.

5. **Replacement Draws**

   * GM pressing **Draw Additional Card** adds exactly one more card to the chooser.
   * GM choosing a keeper sets `currentCard` to that card; others go to discard.
   * Multiple presses accumulate multiple choices.

6. **Late Joiners**

   * Adding a participant **Deal now** assigns a card immediately; **Join next round** adds with no card until next deal.

7. **GM Privacy**

   * With privacy ON, GM sees all card faces; players do not see unrevealed NPC rows; on **Reveal**, the row appears to players with full value in correct sorted position.

8. **Permissions**

   * Players have read-only views; GM can modify any row.

---

## 11) Open Questions (for the team)

* None for MVP (privacy behavior is defined as hidden-until-revealed; players read-only).

---

## 12) Future (nice-to-have, *not* in MVP)

* Player-side **Countdown bar** that highlights the current rank.
* Optional **single card draw** utility outside encounters (same deck object).
* Visual themes (card backs/skins), compact mode, reversible suit-order variant.

---
