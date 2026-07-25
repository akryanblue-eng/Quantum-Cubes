import type { GameState, Group } from '../contracts/game-state';
import { RULESET_VERSION } from '../contracts/game-state';
import { TILE_FAMILIES, makeTile, MIN_VALUE, MAX_VALUE, type Tile } from '../contracts/tile';
import type { Puzzle } from '../contracts/puzzle';
import type { TurnDraft } from '../contracts/turn-draft';
import { withHash } from '../engine/hash-state';
import { commitTurn } from '../engine/commit-turn';
import { mulberry32, randInt, shuffle } from './rng';
import { encodePuzzleCode } from './puzzle-code';

/**
 * Deterministic puzzle generation.
 *
 * A puzzle is built by first constructing several legal groups (Sequences and
 * Clusters) with globally unique (family, value) tiles, then scrambling those
 * tiles into the starting rack. Because the tiles come from legal groups, the
 * puzzle is always solvable by construction — the constructed grouping is one
 * rack-clearing solution (there may be others).
 */

const PLAYER = 'player-1';

function key(family: string, value: number): string {
  return `${family}-${value}`;
}

function trySequence(rng: () => number, used: Set<string>): Tile[] | null {
  for (let attempt = 0; attempt < 24; attempt++) {
    const family = TILE_FAMILIES[randInt(rng, 0, TILE_FAMILIES.length - 1)];
    const length = randInt(rng, 3, 5);
    const maxStart = MAX_VALUE - length + 1;
    if (maxStart < MIN_VALUE) continue;
    const start = randInt(rng, MIN_VALUE, maxStart);

    let clash = false;
    for (let v = start; v < start + length; v++) {
      if (used.has(key(family, v))) {
        clash = true;
        break;
      }
    }
    if (clash) continue;

    const tiles: Tile[] = [];
    for (let v = start; v < start + length; v++) {
      used.add(key(family, v));
      tiles.push(makeTile(family, v));
    }
    return tiles;
  }
  return null;
}

function tryCluster(rng: () => number, used: Set<string>): Tile[] | null {
  for (let attempt = 0; attempt < 24; attempt++) {
    const value = randInt(rng, MIN_VALUE, MAX_VALUE);
    const available = TILE_FAMILIES.filter((f) => !used.has(key(f, value)));
    if (available.length < 3) continue;

    const size = Math.min(available.length, randInt(rng, 3, 4));
    const families = shuffle(rng, available).slice(0, size);
    return families.map((f) => {
      used.add(key(f, value));
      return makeTile(f, value);
    });
  }
  return null;
}

export interface GeneratedPuzzle {
  readonly puzzle: Puzzle;
  /** The canonical rack-clearing solution. For authoring and tests only. */
  readonly solution: Group[];
}

/**
 * Generate a puzzle together with its canonical solution.
 *
 * The `solution` is exposed for authoring and tests; the player-facing `Puzzle`
 * carries only solution *hashes*, never the grouping.
 */
export function generatePuzzleWithSolution(seed: number): GeneratedPuzzle {
  const s = seed >>> 0;
  const rng = mulberry32(s);
  const used = new Set<string>();
  const groups: Group[] = [];
  const target = randInt(rng, 3, 4);

  let id = 1;
  for (let attempt = 0; attempt < 300 && groups.length < target; attempt++) {
    const tiles = rng() < 0.5 ? trySequence(rng, used) : tryCluster(rng, used);
    if (tiles) groups.push({ id: `g-${id++}`, tiles });
  }
  // Guarantee a solvable puzzle with at least two groups.
  while (groups.length < 2) {
    const tiles = trySequence(rng, used) ?? tryCluster(rng, used);
    if (!tiles) break;
    groups.push({ id: `g-${id++}`, tiles });
  }

  const solutionTiles = groups.flatMap((g) => g.tiles);
  const startRack = shuffle(rng, solutionTiles).map((t) => ({ ...t }));

  // Compute the canonical solution hash by actually committing the constructed
  // grouping from the start state, so the stored hash matches a real solve.
  const startState = withHash({
    rack: startRack.map((t) => ({ ...t })),
    table: [],
    turn: 1,
    activePlayer: PLAYER,
    rulesetVersion: RULESET_VERSION,
  });
  const solutionDraft: TurnDraft = {
    startState,
    draftRack: [],
    draftGroups: groups.map((g) => ({ id: g.id, tiles: g.tiles.map((t) => ({ ...t })) })),
    operations: [],
  };
  const solved = commitTurn(startState, solutionDraft, 0);
  const solutionHash = solved.state ? solved.state.hash : startState.hash;

  const puzzle: Puzzle = {
    code: encodePuzzleCode(s),
    seed: s,
    rulesetVersion: RULESET_VERSION,
    startRack,
    solutionHashes: [solutionHash],
  };
  return { puzzle, solution: groups.map((g) => ({ id: g.id, tiles: g.tiles.map((t) => ({ ...t })) })) };
}

export function generatePuzzle(seed: number): Puzzle {
  return generatePuzzleWithSolution(seed).puzzle;
}

/** Build the committed turn-start state for a puzzle (scrambled rack, empty table). */
export function puzzleStartState(puzzle: Puzzle): GameState {
  return withHash({
    rack: puzzle.startRack.map((t) => ({ ...t })),
    table: [],
    turn: 1,
    activePlayer: PLAYER,
    rulesetVersion: puzzle.rulesetVersion,
  });
}

/**
 * Victory check: the rack has been cleared into committed groups.
 *
 * Any legal committed state with an empty rack and at least one group wins —
 * the player found a rack-clearing solution.
 */
export function isPuzzleSolved(state: GameState): boolean {
  return state.rack.length === 0 && state.table.length > 0;
}
