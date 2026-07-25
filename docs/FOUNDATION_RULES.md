# Quantum Cubes Foundation Rules v0.1

**Status: provisional, original game rules.** These rules exist to exercise the
core interaction loop (draft → validate → atomic commit). They are intentionally
minimal and are not an implementation of any other commercial game.

## Tiles

- There are **four families**, each with a distinct color *and* an accessibility
  symbol:

  | Family | Symbol | Role of symbol |
  | ------ | :----: | -------------- |
  | Spark  |   ◆    | identity without relying on color |
  | Flux   |   ●    | identity without relying on color |
  | Prism  |   ▲    | identity without relying on color |
  | Pulse  |   ■    | identity without relying on color |

- Each tile has a **numeric value** in the range 1–13.
- Within a match, each `(family, value)` pair is unique and carries a stable id.

## Legal groups

A group is legal if and only if it is exactly one of the following.

### Sequence

- Three or more tiles.
- All tiles share **one family**.
- Values are **consecutive**.
- **No duplicate values.**

Examples: `Spark 3-4-5`, `Flux 5-6-7-8-9`.

### Cluster

- Three or four tiles.
- All tiles share **one value**.
- Every tile is from a **different family** (no repeats).

Examples: `Flux/Prism/Pulse 7`, `Spark/Flux/Prism/Pulse 10`.

## Legal layout

A draft layout is legal to commit when:

1. Every draft group is a legal Sequence or Cluster.
2. No tile appears more than once across the whole layout.
3. Tiles are conserved — the draft uses exactly the tiles present at the start
   of the turn (tiles left in the rack simply remain in the rack).

## Committing

- Commit validates the **entire** draft layout.
- If any part is illegal, the commit is rejected and the committed state is left
  exactly as it was.
- If the whole layout is legal, a new committed state is produced atomically,
  along with a replayable event and a deterministic resulting-state hash.

## Explicitly out of scope for v0.1

Wildcards, scoring, opening thresholds, drawing tiles, turn timers, and full
match completion are **not** part of this ruleset. See `ROADMAP.md`.
