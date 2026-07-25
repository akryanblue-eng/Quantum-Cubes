import type { GameState } from '../contracts/game-state';
import { RULESET_VERSION } from '../contracts/game-state';
import { makeTile, type TileFamily } from '../contracts/tile';
import { withHash } from './hash-state';

/**
 * A deterministic starting hand for the first implementation slice.
 *
 * The set is deliberately seeded so a new player can immediately discover both
 * legal shapes and experiment freely:
 *   - Spark 3-4-5 form a ready-made Sequence.
 *   - Flux / Prism / Pulse 7 form a ready-made Cluster.
 *   - The remaining tiles invite splitting, merging, and re-sorting.
 */
const STARTING_RACK: ReadonlyArray<readonly [TileFamily, number]> = [
  ['spark', 3],
  ['spark', 4],
  ['spark', 5],
  ['flux', 7],
  ['prism', 7],
  ['pulse', 7],
  ['spark', 9],
  ['flux', 9],
  ['prism', 2],
  ['pulse', 11],
  ['flux', 4],
  ['spark', 6],
  ['prism', 6],
  ['pulse', 6],
];

export function createInitialState(activePlayer = 'player-1'): GameState {
  return withHash({
    rack: STARTING_RACK.map(([family, value]) => makeTile(family, value)),
    table: [],
    turn: 1,
    activePlayer,
    rulesetVersion: RULESET_VERSION,
  });
}
