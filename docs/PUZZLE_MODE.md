# Puzzle Mode v0.2

Puzzle Mode turns the core loop into something you can play, solve, and share —
without any backend. It reuses the existing engine, fixtures, hashing, and
atomic commit unchanged.

## Victory condition — Clear the Rack

> A puzzle is solved when every rack tile is incorporated into a completely
> legal final layout and accepted through **one atomic commit** (the rack ends
> empty).

This is the cleanest expression of Quantum Cubes' core loop. It permits multiple
clever solutions, exercises conservation and validation, and never punishes a
player for finding a legal arrangement different from the author's.

Explicitly **not** in this slice:
- **Goal specifications** ("create four groups", "preserve this cluster", "solve
  in exactly two rearrangements") — reserved for v0.3.
- **Exact-hash victory** — a puzzle may store known solution *hashes* for
  authoring and tests, but any legal rack-clearing solution wins.

## Determinism & puzzle codes

- A puzzle is fully determined by an unsigned 32-bit **seed**. The same seed
  always produces the same scrambled starting rack (`src/puzzle/rng.ts`,
  `generate-puzzle.ts`).
- Puzzles are shared as **codes** of the form `QC1-<base36 seed>-<checksum>`
  (case-insensitive), e.g. `QC1-1a-1` (`src/puzzle/puzzle-code.ts`). The
  one-character checksum rejects most mistyped codes rather than silently
  loading a different puzzle.
- Everything is client-side. No network, accounts, or storage.

## Solvability by construction

Generation first builds several legal groups (Sequences and Clusters) using
globally unique `(family, value)` tiles, then scrambles those tiles into the
rack. Because every tile came from a legal group, the constructed grouping is
always at least one rack-clearing solution — puzzles are never unsolvable.

For authoring and regression tests, `generatePuzzleWithSolution(seed)` also
returns the canonical solution and its committed-state hash. The player-facing
`Puzzle` carries only the solution *hashes*, never the grouping.

## Playing

Switch to **Puzzle** mode in the header. Each attempt shows:
- the shareable puzzle **code** (with Copy),
- the objective (clear your rack in one legal commit),
- an **operations** counter (sandbox moves used this attempt),
- **New puzzle** (random seed), **Restart** (same seed), and **Load a shared
  code**.

On a winning commit the app announces `Solved in N operation(s)!`. The operation
count is surfaced now so a future "fewest operations" daily competition (see
`ROADMAP.md`) can build on it without engine changes.

## What this slice does not include

No drag-and-drop (tap interaction only), and no daily "Quantum Collapse"
competition or any backend. Those are future work.
