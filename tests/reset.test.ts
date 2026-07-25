import { describe, it, expect } from 'vitest';
import {
  startDraft,
  resetDraft,
  createGroupFromTile,
  moveTileToGroup,
  moveTileToRack,
} from '../src/engine/draft-ops';
import { makeState } from './helpers';

function ids(tiles: { id: string }[]): string[] {
  return tiles.map((t) => t.id);
}

describe('resetDraft', () => {
  it('restores the exact turn-start rack and table after manipulation', () => {
    const start = makeState({
      rack: [['spark', 3], ['spark', 4], ['spark', 5], ['flux', 7]],
      table: [],
    });

    let draft = startDraft(start);
    const startRackIds = ids(draft.draftRack);

    // Churn the sandbox thoroughly.
    draft = createGroupFromTile(draft, 't-spark-3');
    draft = moveTileToGroup(draft, 't-spark-4', 'g-1');
    draft = moveTileToRack(draft, 't-spark-4');
    draft = createGroupFromTile(draft, 't-flux-7');

    expect(draft.draftGroups.length).toBeGreaterThan(0);

    const reset = resetDraft(draft);
    expect(ids(reset.draftRack).sort()).toEqual(startRackIds.sort());
    expect(reset.draftGroups).toEqual(start.table);
    expect(reset.operations).toHaveLength(0);
    expect(reset.startState).toBe(start);
  });
});
