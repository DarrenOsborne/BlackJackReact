# BlackJackReact

A blackjack game + card counting training app built with React + TypeScript.
The core engine is **pure, deterministic logic** so it’s easy to test and safe to reuse in UI or training modes.

This repo currently focuses on the **frontend** (Vite + React) and a complete blackjack engine
with multi-seat support, timers, and card-counting state.

---

## Highlights

- **Pure engine**: Reducer-driven game logic with rules, payouts, and card flow.
- **Multi-seat play**: Add seats, per-seat bankrolls, ready states, insurance, and turn order.
- **Deterministic testing**: Tests use fixed shoes to verify outcomes.
- **Training modes**: Live Count + Spam Count drills to build running-count speed.
- **UI-first layout**: Table, dealer, player seats, and status widgets.

---

## Repo structure (high level)

```
apps/
  web/                    # Vite + React app
    src/
      app/                # Routes (Play, Training, etc.)
      game/               # Core engine (pure logic)
      ui/                 # Table, cards, controls, visuals
      styles.css          # Main theme + component styling
```

### Important folders

- `apps/web/src/game/engine/`
  - `model/` – types, reducer, deck, draw, hand evaluation
  - `rules/` – blackjack rules, payouts, shoe rules
  - `counting/` – running count logic (Hi-Lo)
  - `__tests__/` – engine tests (Vitest)
- `apps/web/src/app/routes/`
  - `Play.tsx` – full game UI (multi-seat)
  - `Training.tsx` – Spam Count + Live Count training
- `apps/web/src/ui/components/`
  - `Cards/` – Card, Hand
  - `Table/` – Table layout, shoe, discard, penetration bar
  - `Controls/` – Bet controls, action buttons

---

## Prerequisites

- **Node.js**: recommended 18+ (Vite 5 works best on current LTS)
- **npm**: comes with Node.js

Check versions:

```
node -v
npm -v
```

---

## Quick start

From repo root:

```
cd apps/web
npm install
npm run dev
```

Then open the dev server URL printed by Vite (usually `http://localhost:5173`).

---

## Scripts

From `apps/web`:

- `npm run dev` – start dev server
- `npm run build` – build production bundle
- `npm run preview` – preview production build
- `npm run test` – run engine tests
- `npm run test:watch` – watch tests

---

## Game engine overview

The engine is **reducer-based** and uses a deterministic shoe.
It powers both the Play UI and the Training drills.

### Core concepts

- **Shoe**: Multi-deck card shoe with shuffle + penetration tracking.
- **Seats**: Each seat has its own bankroll, bet, ready state, hands, and insurance.
- **Phases**:
  - `BETTING` → `DEALING` → `INSURANCE` → `PLAYER_TURN` → `DEALER_TURN` → `BETTING`
- **Timers**:
  - Auto-deal countdown when betting
  - Per-turn countdown for player actions
  - Dealer tick pace for realism

### Key engine files

- `apps/web/src/game/engine/model/types.ts`
- `apps/web/src/game/engine/model/reducer.ts`
- `apps/web/src/game/engine/model/state.ts`
- `apps/web/src/game/engine/model/handValue.ts`
- `apps/web/src/game/engine/rules/blackjackRules.ts`

---

## Play tab features

- Multi-seat table with **Add seat** (up to 7)
- Each seat:
  - Bet controls
  - Ready toggle (green = ready, red = not ready)
  - Bankroll and insurance
  - Split / double / surrender where allowed
- Round auto-starts when:
  - **All seats are ready**, or
  - The auto-deal timer expires with at least one ready seat
- If no one is ready, the round is skipped and a new timer begins

---

## Training tab features

### Spam Count

- Press **New card** to cycle cards rapidly
- Random check-ins ask for running count
- Adjustable prompt ranges (5–10, 10–20, 20–50)

### Live Count

- Dealer + player run rounds using perfect play
- Adjustable pace (200ms to 2000ms)
- Adjustable check-in interval (every 1/2/5 rounds)
- Round transition delay (1/3/5 seconds)

---

## Rules & payouts

- Blackjack: **3:2**
- Win: **1:1**
- Push: **bet returned**
- Insurance: **2:1**
- Surrender: **lose half**
- Dealer stands on soft 17 (**S17**)
- Double after split allowed (**DAS**)

These are all configurable in `blackjackRules.ts`.

---

## Testing

Engine tests live in:

```
apps/web/src/game/engine/__tests__/
```

Run tests:

```
cd apps/web
npm run test
```

---

## Contributing

If you want to extend the engine or UI:

- Keep engine logic pure and deterministic.
- UI should **never** mutate engine state directly.
- Add tests for any rule changes.

---

## Roadmap ideas (optional)

- Multiplayer sessions with persistence (FastAPI backend)
- Persistent profiles and long-term stats
- True-count training + index plays
- Custom rulesets per table
- Coaching overlays and hints

---

## License

No license specified yet. Add one if you plan to distribute.
