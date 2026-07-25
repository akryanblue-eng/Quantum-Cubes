# Roadmap

The core loop (rack, Quantum Sandbox, live legality, atomic commit, replayable
ledger, deterministic hashing) shipped first. **Puzzle Mode v0.2** shipped next.
Everything below Puzzle Mode is **future work and is intentionally not
implemented yet.**

## Puzzle mode — delivered (v0.2)

Deterministic, seed-based puzzles with shareable codes. Victory is **clear the
rack** — use every tile in one legal atomic commit. See
[`PUZZLE_MODE.md`](PUZZLE_MODE.md). Follow-ups still open:

- **Goal specifications** ("create four groups", "preserve this cluster", "solve
  in exactly two rearrangements") — a v0.3 challenge system.
- **Daily "Quantum Collapse"** — one shared seeded board per day, ranked by
  fewest operations rather than fastest time. Needs a small backend later; the
  operation counter already exists client-side.
- **Drag-and-drop** interaction polish alongside the current tap model.

## Local AI personalities

On-device opponents with distinct heuristics and risk appetites. Pure functions
over game state — no network required.

## Real-time multiplayer

Shared live matches. Requires a networked authority for the committed state and
conflict handling via the existing `state_version_conflict` result.

## Asynchronous Daily Move mode

A slow, turn-by-turn mode where each player commits one move per day against a
shared, hash-chained ledger.

## Post-match analysis

Replay the event ledger to reconstruct any point in a match, annotate turns, and
surface missed legal layouts.

## Cosmetics and progression

Optional tile skins, board themes, and non-pay-to-win progression. Must never
compromise the color-plus-symbol accessibility guarantee.

---

### Deliberately excluded from the current slice

No multiplayer, accounts, store, guild, voice-chat, or battle-pass
implementation exists in this repository, by design.
