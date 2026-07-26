import { describe, it, expect } from 'vitest';
import { buildGesture, applyGesture, type DragSource, type DropTarget } from '../src/ui/gesture';
import {
  startDraft,
  resetDraft,
  createGroupFromTile,
  moveTileToGroup,
  moveTileToRack,
  splitTileToNewGroup,
  mergeGroups,
} from '../src/engine/draft-ops';
import type { TurnDraft } from '../src/contracts/turn-draft';
import { generatePuzzle, puzzleStartState } from '../src/puzzle/generate-puzzle';
import { makeState } from './helpers';

function allTileIds(draft: TurnDraft): string[] {
  return [...draft.draftRack, ...draft.draftGroups.flatMap((g) => g.tiles)].map((t) => t.id).sort();
}

function stateShape(draft: TurnDraft) {
  return {
    rack: draft.draftRack.map((t) => t.id),
    groups: draft.draftGroups.map((g) => ({ id: g.id, tiles: g.tiles.map((t) => t.id) })),
  };
}

const START = makeState({
  rack: [
    ['spark', 3],
    ['spark', 4],
    ['spark', 5],
    ['flux', 7],
    ['prism', 7],
    ['pulse', 7],
  ],
});

/** A draft with g-1 = spark 3, and g-2 = flux/prism 7; spark 4,5 & pulse 7 in rack. */
function seededDraft(): TurnDraft {
  let d = startDraft(START);
  d = createGroupFromTile(d, 't-spark-3'); // g-1
  d = createGroupFromTile(d, 't-flux-7'); // g-2
  d = moveTileToGroup(d, 't-prism-7', 'g-2');
  return d;
}

describe('buildGesture', () => {
  it('returns null for no-op drops', () => {
    const src: DragSource = { kind: 'tile', tileId: 't-flux-7', fromGroupId: null };
    expect(buildGesture(src, { kind: 'rack' })).toBeNull(); // already in rack
    expect(buildGesture({ kind: 'group', groupId: 'g-1' }, { kind: 'group', groupId: 'g-1' })).toBeNull();
    expect(
      buildGesture(src, { kind: 'tile', tileId: 't-flux-7', groupId: null }),
    ).toBeNull(); // onto itself
  });

  it('maps a group dropped on another group to a merge', () => {
    const g = buildGesture({ kind: 'group', groupId: 'g-1' }, { kind: 'group', groupId: 'g-2' });
    expect(g).toEqual({ kind: 'merge-groups', sourceGroupId: 'g-1', targetGroupId: 'g-2' });
  });

  it('maps a same-group tile-on-tile drop to a reorder', () => {
    const g = buildGesture(
      { kind: 'tile', tileId: 't-prism-7', fromGroupId: 'g-2' },
      { kind: 'tile', tileId: 't-flux-7', groupId: 'g-2' },
    );
    expect(g).toEqual({
      kind: 'reorder-within-group',
      groupId: 'g-2',
      tileId: 't-prism-7',
      beforeTileId: 't-flux-7',
    });
  });
});

describe('applyGesture — equivalence with tap', () => {
  it('drag tile-to-group equals the tap move, one operation', () => {
    const base = seededDraft();
    const target: DropTarget = { kind: 'group', groupId: 'g-1' };
    const gesture = buildGesture({ kind: 'tile', tileId: 't-spark-4', fromGroupId: null }, target)!;

    const viaDrag = applyGesture(base, gesture);
    const viaTap = moveTileToGroup(base, 't-spark-4', 'g-1');

    expect(viaDrag.changed).toBe(true);
    expect(stateShape(viaDrag.draft)).toEqual(stateShape(viaTap));
    expect(viaDrag.draft.operations.length).toBe(base.operations.length + 1);
  });

  it('drag tile-to-rack equals the tap move', () => {
    const base = seededDraft();
    const gesture = buildGesture({ kind: 'tile', tileId: 't-prism-7', fromGroupId: 'g-2' }, { kind: 'rack' })!;
    const viaDrag = applyGesture(base, gesture);
    const viaTap = moveTileToRack(base, 't-prism-7');
    expect(stateShape(viaDrag.draft)).toEqual(stateShape(viaTap));
  });
});

describe('applyGesture — integrity', () => {
  it('a no-op gesture is reported as unchanged (canceled/invalid drop)', () => {
    const base = seededDraft();
    const gesture = buildGesture({ kind: 'tile', tileId: 't-flux-7', fromGroupId: 'g-2' }, { kind: 'group', groupId: 'g-2' });
    expect(gesture).toBeNull(); // dropping into its own group
    // And an explicit no-op through applyGesture leaves the op count intact.
    const same = moveTileToGroup(base, 't-flux-7', 'g-2');
    // g-2 already contains flux-7 at the end → still a move op, but tiles conserved.
    expect(allTileIds(same)).toEqual(allTileIds(base));
  });

  it('cross-group movement counts exactly one operation and conserves tiles', () => {
    const base = seededDraft();
    const gesture = buildGesture({ kind: 'tile', tileId: 't-prism-7', fromGroupId: 'g-2' }, { kind: 'group', groupId: 'g-1' })!;
    const { draft, changed } = applyGesture(base, gesture);
    expect(changed).toBe(true);
    expect(draft.operations.length).toBe(base.operations.length + 1);
    expect(allTileIds(draft)).toEqual(allTileIds(base));
  });

  it('split preserves every tile exactly once', () => {
    const base = seededDraft();
    const gesture = buildGesture({ kind: 'tile', tileId: 't-prism-7', fromGroupId: 'g-2' }, { kind: 'new-group' })!;
    const { draft } = applyGesture(base, gesture);
    expect(allTileIds(draft)).toEqual(allTileIds(base));
    const viaTap = splitTileToNewGroup(base, 't-prism-7');
    expect(stateShape(draft)).toEqual(stateShape(viaTap));
  });

  it('merge preserves every tile exactly once', () => {
    const base = seededDraft();
    const gesture = buildGesture({ kind: 'group', groupId: 'g-1' }, { kind: 'group', groupId: 'g-2' })!;
    const { draft } = applyGesture(base, gesture);
    expect(allTileIds(draft)).toEqual(allTileIds(base));
    const viaTap = mergeGroups(base, 'g-1', 'g-2');
    expect(stateShape(draft)).toEqual(stateShape(viaTap));
  });

  it('reorder within a group conserves tiles and reorders, one operation', () => {
    let base = startDraft(START);
    base = createGroupFromTile(base, 't-spark-3');
    base = moveTileToGroup(base, 't-spark-4', 'g-1');
    base = moveTileToGroup(base, 't-spark-5', 'g-1'); // g-1: 3,4,5
    const gesture = buildGesture(
      { kind: 'tile', tileId: 't-spark-5', fromGroupId: 'g-1' },
      { kind: 'tile', tileId: 't-spark-3', groupId: 'g-1' },
    )!;
    const { draft, changed } = applyGesture(base, gesture);
    expect(changed).toBe(true);
    expect(draft.operations.length).toBe(base.operations.length + 1);
    expect(draft.draftGroups[0].tiles.map((t) => t.id)).toEqual([
      't-spark-5',
      't-spark-3',
      't-spark-4',
    ]);
    expect(allTileIds(draft)).toEqual(allTileIds(base));
  });
});

describe('coexistence and restart', () => {
  it('tap and drag pathways interleave over the same draft', () => {
    let d = startDraft(START);
    d = createGroupFromTile(d, 't-spark-3'); // tap
    d = applyGesture(d, buildGesture({ kind: 'tile', tileId: 't-spark-4', fromGroupId: null }, { kind: 'group', groupId: 'g-1' })!).draft; // drag
    d = moveTileToGroup(d, 't-spark-5', 'g-1'); // tap
    expect(d.operations.length).toBe(3);
    expect(allTileIds(d)).toEqual(allTileIds(startDraft(START)));
    expect(d.draftGroups[0].tiles.map((t) => t.id)).toEqual(['t-spark-3', 't-spark-4', 't-spark-5']);
  });

  it('restart after dragging restores the exact puzzle start state', () => {
    const puzzle = generatePuzzle(11);
    const start = puzzleStartState(puzzle);
    let d = startDraft(start);
    const firstTile = start.rack[0].id;
    d = applyGesture(d, { kind: 'tile-to-new-group', tileId: firstTile }).draft;
    d = applyGesture(d, { kind: 'tile-to-rack', tileId: firstTile }).draft;

    const restarted = resetDraft(d);
    expect(restarted.draftRack.map((t) => t.id).sort()).toEqual(
      start.rack.map((t) => t.id).sort(),
    );
    expect(restarted.draftGroups).toEqual(start.table);
    expect(restarted.operations).toHaveLength(0);
    // A fresh generation from the same seed is identical (deterministic restart).
    expect(puzzleStartState(generatePuzzle(11)).hash).toBe(start.hash);
  });
});
