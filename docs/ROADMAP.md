# Roadmap

This slice delivers the core loop only: rack, Quantum Sandbox, live legality,
atomic commit, replayable ledger, deterministic hashing. Everything below is
**future work and is intentionally not implemented yet.**

## Puzzle mode

Curated turn-start states with a target the player must reach in one legal
commit. Deterministic seeds; shareable puzzle codes.

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
