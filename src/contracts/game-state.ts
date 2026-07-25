import type { Tile } from './tile';

/** Provisional, original ruleset identifier — see docs/FOUNDATION_RULES.md. */
export const RULESET_VERSION = 'quantum-cubes-foundation-rules-v0.1';

/** A committed or draft group of tiles (a candidate Sequence or Cluster). */
export interface Group {
  readonly id: string;
  readonly tiles: Tile[];
}

/**
 * The committed match state.
 *
 * This is the only state that persists between turns. It is never mutated by
 * draft manipulation — it changes exclusively through an atomic commit.
 */
export interface GameState {
  /** Tiles held by the active player, not yet placed on the table. */
  readonly rack: Tile[];
  /** Committed groups on the shared table. */
  readonly table: Group[];
  readonly turn: number;
  readonly activePlayer: string;
  readonly rulesetVersion: string;
  /** Deterministic hash of the committed state (see engine/hash-state.ts). */
  readonly hash: string;
}
