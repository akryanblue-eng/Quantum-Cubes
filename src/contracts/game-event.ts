import type { Group } from './game-state';

/**
 * A replayable ledger entry produced by exactly one accepted commit.
 *
 * The entry chains committed states by hash (`previousHash` -> `resultingHash`)
 * and uses a deterministic `sequence` number. Wall-clock time is never used as
 * an input to state hashing.
 */
export interface GameEvent {
  readonly id: string;
  readonly turn: number;
  readonly previousHash: string;
  readonly resultingHash: string;
  /** The committed groups after this commit. */
  readonly groups: Group[];
  /** Deterministic, monotonically increasing sequence number. */
  readonly sequence: number;
}
