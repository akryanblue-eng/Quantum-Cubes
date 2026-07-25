import type { Tile } from './tile';
import type { GameState, Group } from './game-state';

export type DraftOperationKind =
  | 'move-to-group'
  | 'move-to-rack'
  | 'create-group'
  | 'split-group'
  | 'merge-groups'
  | 'reorder-group';

/** A single recorded manipulation inside the Quantum Sandbox. */
export interface DraftOperation {
  readonly kind: DraftOperationKind;
  readonly detail: Record<string, unknown>;
}

/**
 * The Quantum Sandbox working area for one turn.
 *
 * `startState` is an immutable reference to the committed state at the moment
 * the turn began. Draft manipulation happens only on `draftRack` and
 * `draftGroups`; the committed state is untouched until an atomic commit.
 */
export interface TurnDraft {
  readonly startState: GameState;
  readonly draftRack: Tile[];
  readonly draftGroups: Group[];
  readonly operations: DraftOperation[];
}
