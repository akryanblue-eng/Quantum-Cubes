import type { Tile } from './tile';

/**
 * A Puzzle Mode v0.2 challenge.
 *
 * A puzzle is fully determined by its numeric `seed`: the same seed always
 * yields the same scrambled starting rack. The victory condition is to **clear
 * the rack** — place every tile into legal groups and accept them in one atomic
 * commit.
 *
 * `solutionHashes` holds one or more known committed-state hashes for authoring
 * and regression tests. It is NOT the player-facing victory condition: any legal
 * rack-clearing layout wins, whether or not its hash appears here.
 */
export interface Puzzle {
  /** Shareable, human-typeable code (e.g. "QC1-1a-1"). */
  readonly code: string;
  readonly seed: number;
  readonly rulesetVersion: string;
  /** The scrambled tiles the player starts with. */
  readonly startRack: Tile[];
  /** Known canonical-solution hashes, for authoring and tests only. */
  readonly solutionHashes: string[];
}
