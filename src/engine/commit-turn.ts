import type { GameState, Group } from '../contracts/game-state';
import type { Tile } from '../contracts/tile';
import type { TurnDraft } from '../contracts/turn-draft';
import type { MoveResult } from '../contracts/move-result';
import type { GameEvent } from '../contracts/game-event';
import { validateLayout } from './validate-layout';
import { withHash } from './hash-state';

/** Outcome of an atomic commit attempt. */
export interface CommitOutcome {
  readonly ok: boolean;
  readonly result: MoveResult;
  /** New committed state — present only when `ok`. */
  readonly state?: GameState;
  /** Replayable ledger event — present only when `ok`. */
  readonly event?: GameEvent;
}

function cloneTile(tile: Tile): Tile {
  return { ...tile };
}

function cloneGroup(group: Group): Group {
  return { id: group.id, tiles: group.tiles.map(cloneTile) };
}

/**
 * Attempt to atomically commit a draft.
 *
 * This function is pure: it never mutates `current` or `draft`. On any
 * rejection the committed state is returned unchanged (by virtue of the caller
 * keeping `current`), and no event is produced.
 *
 * Steps:
 *   1. Guard against a stale draft (state_version_conflict).
 *   2. Validate the complete draft layout.
 *   3. Reject invalid layouts without mutation.
 *   4. Produce a new committed state and a replayable event with a
 *      deterministic resulting-state hash.
 */
export function commitTurn(current: GameState, draft: TurnDraft, sequence: number): CommitOutcome {
  if (draft.startState.hash !== current.hash) {
    return {
      ok: false,
      result: { kind: 'state_version_conflict', expected: draft.startState.hash, actual: current.hash },
    };
  }

  const layout = validateLayout(draft);
  if (!layout.legal) {
    return { ok: false, result: layout.result };
  }

  const nextState = withHash({
    rack: draft.draftRack.map(cloneTile),
    table: draft.draftGroups.map(cloneGroup),
    turn: current.turn + 1,
    activePlayer: current.activePlayer,
    rulesetVersion: current.rulesetVersion,
  });

  const event: GameEvent = {
    id: `evt-t${nextState.turn}-s${sequence}`,
    turn: nextState.turn,
    previousHash: current.hash,
    resultingHash: nextState.hash,
    groups: nextState.table.map(cloneGroup),
    sequence,
  };

  return { ok: true, result: { kind: 'accepted' }, state: nextState, event };
}
