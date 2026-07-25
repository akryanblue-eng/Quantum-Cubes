import type { TurnDraft } from '../contracts/turn-draft';
import type { Tile } from '../contracts/tile';
import type { MoveResult } from '../contracts/move-result';
import { validateGroup, type GroupValidation } from './validate-group';

/**
 * Result of validating an entire draft layout.
 *
 * `groupResults` is keyed by group id so the UI can annotate each group with
 * live legal / illegal feedback, while `result` is the single decisive outcome
 * used to gate the Commit button.
 */
export interface LayoutValidation {
  readonly legal: boolean;
  readonly result: MoveResult;
  readonly groupResults: Record<string, GroupValidation>;
}

function tileIds(tiles: readonly Tile[]): string[] {
  return tiles.map((t) => t.id);
}

/**
 * Validate a full draft against the turn-start universe of tiles.
 *
 * Checks, in order:
 *   1. No tile appears twice across the draft (rack + all groups).
 *   2. Tile conservation — the draft uses exactly the turn-start tiles.
 *   3. Every draft group is a legal Sequence or Cluster.
 *
 * Tiles left in the draft rack are allowed; they simply remain in the rack.
 */
export function validateLayout(draft: TurnDraft): LayoutValidation {
  const universe = new Set<string>([
    ...tileIds(draft.startState.rack),
    ...draft.startState.table.flatMap((g) => tileIds(g.tiles)),
  ]);

  const draftTiles: Tile[] = [
    ...draft.draftRack,
    ...draft.draftGroups.flatMap((g) => g.tiles),
  ];

  // 1. Duplicate detection.
  const seen = new Set<string>();
  for (const tile of draftTiles) {
    if (seen.has(tile.id)) {
      return {
        legal: false,
        result: { kind: 'tile_duplicated', tileId: tile.id },
        groupResults: {},
      };
    }
    seen.add(tile.id);
  }

  // 2a. Unknown tiles (a tile that was never part of this match).
  for (const id of seen) {
    if (!universe.has(id)) {
      return { legal: false, result: { kind: 'tile_missing', tileId: id }, groupResults: {} };
    }
  }
  // 2b. Lost tiles (a turn-start tile that vanished from the draft).
  for (const id of universe) {
    if (!seen.has(id)) {
      return { legal: false, result: { kind: 'tile_missing', tileId: id }, groupResults: {} };
    }
  }

  // 3. Every group must be a legal Sequence or Cluster.
  const groupResults: Record<string, GroupValidation> = {};
  let firstInvalid: { groupId: string; reason: string } | null = null;
  for (const group of draft.draftGroups) {
    const validation = validateGroup(group);
    groupResults[group.id] = validation;
    if (!validation.valid && firstInvalid === null) {
      firstInvalid = { groupId: group.id, reason: validation.reason };
    }
  }

  if (firstInvalid) {
    return {
      legal: false,
      result: { kind: 'invalid_group', groupId: firstInvalid.groupId, reason: firstInvalid.reason },
      groupResults,
    };
  }

  return { legal: true, result: { kind: 'accepted' }, groupResults };
}
