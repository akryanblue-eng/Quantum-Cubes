import type { GameState, Group } from '../contracts/game-state';
import type { Tile } from '../contracts/tile';
import type { TurnDraft, DraftOperation } from '../contracts/turn-draft';

/**
 * Pure manipulation of the Quantum Sandbox.
 *
 * Every function returns a brand-new TurnDraft and never mutates its input or
 * the committed `startState`. This keeps the UI a thin shell over deterministic
 * transforms and guarantees the committed state is untouchable during drafting.
 */

function cloneTile(tile: Tile): Tile {
  return { ...tile };
}

function cloneGroup(group: Group): Group {
  return { id: group.id, tiles: group.tiles.map(cloneTile) };
}

function cloneGroups(groups: readonly Group[]): Group[] {
  return groups.map(cloneGroup);
}

function record(draft: TurnDraft, op: DraftOperation): TurnDraft {
  return { ...draft, operations: [...draft.operations, op] };
}

function pruneEmpty(groups: Group[]): Group[] {
  return groups.filter((g) => g.tiles.length > 0);
}

function nextGroupId(draft: TurnDraft): string {
  let max = 0;
  for (const group of draft.draftGroups) {
    const match = /^g-(\d+)$/.exec(group.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `g-${max + 1}`;
}

/** Remove a tile from wherever it currently sits, returning fresh collections. */
function extract(
  draft: TurnDraft,
  tileId: string,
): { tile: Tile; rack: Tile[]; groups: Group[] } | null {
  const rackIndex = draft.draftRack.findIndex((t) => t.id === tileId);
  if (rackIndex >= 0) {
    const tile = cloneTile(draft.draftRack[rackIndex]);
    const rack = draft.draftRack.filter((_, i) => i !== rackIndex).map(cloneTile);
    return { tile, rack, groups: cloneGroups(draft.draftGroups) };
  }

  for (const group of draft.draftGroups) {
    const index = group.tiles.findIndex((t) => t.id === tileId);
    if (index >= 0) {
      const tile = cloneTile(group.tiles[index]);
      const groups = draft.draftGroups.map((g) =>
        g.id === group.id
          ? { id: g.id, tiles: g.tiles.filter((_, i) => i !== index).map(cloneTile) }
          : cloneGroup(g),
      );
      return { tile, rack: draft.draftRack.map(cloneTile), groups };
    }
  }

  return null;
}

/** Begin a fresh sandbox from a committed state. */
export function startDraft(state: GameState): TurnDraft {
  return {
    startState: state,
    draftRack: state.rack.map(cloneTile),
    draftGroups: cloneGroups(state.table),
    operations: [],
  };
}

/** Restore the draft to the exact turn-start state (Reset). */
export function resetDraft(draft: TurnDraft): TurnDraft {
  return startDraft(draft.startState);
}

/** Move a tile into an existing group. No-op if the group no longer exists. */
export function moveTileToGroup(draft: TurnDraft, tileId: string, groupId: string): TurnDraft {
  const extracted = extract(draft, tileId);
  if (!extracted) return draft;

  let placed = false;
  const groups = extracted.groups.map((g) => {
    if (g.id === groupId) {
      placed = true;
      return { id: g.id, tiles: [...g.tiles, extracted.tile] };
    }
    return g;
  });
  if (!placed) return draft;

  return record(
    { ...draft, draftRack: extracted.rack, draftGroups: pruneEmpty(groups) },
    { kind: 'move-to-group', detail: { tileId, groupId } },
  );
}

/** Move a tile back to the draft rack. */
export function moveTileToRack(draft: TurnDraft, tileId: string): TurnDraft {
  const extracted = extract(draft, tileId);
  if (!extracted) return draft;

  return record(
    {
      ...draft,
      draftRack: [...extracted.rack, extracted.tile],
      draftGroups: pruneEmpty(extracted.groups),
    },
    { kind: 'move-to-rack', detail: { tileId } },
  );
}

/** Create a new group seeded with a single tile taken from the rack. */
export function createGroupFromTile(draft: TurnDraft, tileId: string): TurnDraft {
  const extracted = extract(draft, tileId);
  if (!extracted) return draft;

  const id = nextGroupId(draft);
  const groups = pruneEmpty([...extracted.groups, { id, tiles: [extracted.tile] }]);
  return record(
    { ...draft, draftRack: extracted.rack, draftGroups: groups },
    { kind: 'create-group', detail: { tileId, groupId: id } },
  );
}

/** Split a tile out of its current group into a fresh group of its own. */
export function splitTileToNewGroup(draft: TurnDraft, tileId: string): TurnDraft {
  const extracted = extract(draft, tileId);
  if (!extracted) return draft;

  const id = nextGroupId(draft);
  const groups = pruneEmpty([...extracted.groups, { id, tiles: [extracted.tile] }]);
  return record(
    { ...draft, draftRack: extracted.rack, draftGroups: groups },
    { kind: 'split-group', detail: { tileId, groupId: id } },
  );
}

/** Merge every tile of group B into group A, then drop group B. */
export function mergeGroups(draft: TurnDraft, groupIdA: string, groupIdB: string): TurnDraft {
  if (groupIdA === groupIdB) return draft;
  const a = draft.draftGroups.find((g) => g.id === groupIdA);
  const b = draft.draftGroups.find((g) => g.id === groupIdB);
  if (!a || !b) return draft;

  const groups = draft.draftGroups
    .filter((g) => g.id !== groupIdB)
    .map((g) =>
      g.id === groupIdA
        ? { id: g.id, tiles: [...a.tiles.map(cloneTile), ...b.tiles.map(cloneTile)] }
        : cloneGroup(g),
    );

  return record(
    { ...draft, draftGroups: pruneEmpty(groups) },
    { kind: 'merge-groups', detail: { groupIdA, groupIdB } },
  );
}

/** Sort the tiles inside a single group by value then family. */
export function sortGroup(draft: TurnDraft, groupId: string): TurnDraft {
  const groups = draft.draftGroups.map((g) =>
    g.id === groupId
      ? {
          id: g.id,
          tiles: [...g.tiles].sort((x, y) => x.value - y.value || x.family.localeCompare(y.family)),
        }
      : cloneGroup(g),
  );
  return record({ ...draft, draftGroups: groups }, { kind: 'reorder-group', detail: { groupId } });
}

/** Rack sorting helper: order by numeric value, then family. */
export function sortRackByValue(draft: TurnDraft): TurnDraft {
  return {
    ...draft,
    draftRack: [...draft.draftRack].sort(
      (a, b) => a.value - b.value || a.family.localeCompare(b.family),
    ),
  };
}

/** Rack sorting helper: order by family, then numeric value. */
export function sortRackByFamily(draft: TurnDraft): TurnDraft {
  return {
    ...draft,
    draftRack: [...draft.draftRack].sort(
      (a, b) => a.family.localeCompare(b.family) || a.value - b.value,
    ),
  };
}
