# Quantum Cubes

An original, mobile-first **tile-combination strategy game**. Its signature
mechanic is the **Quantum Sandbox**: a protected draft space where you can
freely rearrange, split, merge, and test tile combinations. The committed match
state never changes until your entire proposed layout is legal and you press one
atomic **Commit** button.

> Players may freely experiment with possible layouts inside the Quantum
> Sandbox, but the committed match state changes only through one atomic, fully
> validated commit.

This is an original game with its own provisional ruleset. It is **not** a clone
of, and does not copy the branding, artwork, rules, terminology, board
presentation, or visual design of, any commercial tile game.

## Quick start

```bash
npm install
npm run dev      # start the local dev server (Vite)
npm test         # run the engine, replay, and fixture tests (Vitest)
npm run build    # type-check and produce a production build in dist/
```

Open the dev server URL in a mobile viewport (or your browser's device toolbar)
to play the prototype.

## What's in the game

- A deterministic starting rack and a shared committed table.
- A protected **Quantum Sandbox** for draft manipulation.
- Tap-based tile movement between rack and sandbox.
- Create, split, merge, and reorder draft groups.
- Live legal / illegal feedback per group and overall.
- A **Commit** button enabled only when the whole layout is legal.
- A **Reset** button that restores the exact turn-start state.
- Rack sorting by value and by family.
- Color **plus** accessibility symbols on every tile.
- A small **event ledger** of accepted commits.
- Deterministic **state hashing** for committed states.

### Puzzle Mode (v0.2)

- Switch to **Puzzle** in the header for deterministic, seed-based challenges.
- Victory is **Clear the Rack** — place every tile into legal groups and commit
  once. Any legal rack-clearing solution wins.
- Shareable **puzzle codes** (`QC1-…`), a random **New puzzle**, **Restart**, an
  **operations** counter, and **Load a shared code** — all client-side, no
  backend. See [`docs/PUZZLE_MODE.md`](docs/PUZZLE_MODE.md).

## Architecture

```
src/
  contracts/     # pure data shapes: tile, game-state, turn-draft, move-result, game-event
  engine/        # pure, DOM-independent rules: validate-group, validate-layout,
                 # commit-turn, hash-state, draft-ops, initial-state
  puzzle/        # deterministic puzzle generation, codes, victory (Puzzle Mode)
  replay/        # reconstruct committed state from the event ledger
  ui/            # app controller, tap interactions, DOM rendering
  styles/        # app.css
fixtures/        # legal-layouts/ and illegal-layouts/ JSON, checked by tests
tests/           # Vitest specs — run without loading the UI
docs/            # doctrine, foundation rules, mobile interaction spec, roadmap
```

The **engine is pure and independent of the DOM**. The same initial state and
ordered operations always produce the same resulting state and hash. Draft
manipulation never mutates committed state, and commit is all-or-nothing.

## Rules

See [`docs/FOUNDATION_RULES.md`](docs/FOUNDATION_RULES.md) for **Quantum Cubes
Foundation Rules v0.1**. In brief, a legal group is either a **Sequence** (3+
tiles, one family, consecutive values) or a **Cluster** (3–4 tiles, one value,
all different families).

## Roadmap

Puzzle mode, local AI, multiplayer, a Daily Move mode, post-match analysis, and
cosmetics are described in [`docs/ROADMAP.md`](docs/ROADMAP.md) and are **not**
implemented in this slice.
