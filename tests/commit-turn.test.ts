import { describe, it, expect } from 'vitest';
import { commitTurn } from '../src/engine/commit-turn';
import { hashState } from '../src/engine/hash-state';
import {
  startDraft,
  createGroupFromTile,
  moveTileToGroup,
} from '../src/engine/draft-ops';
import type { TurnDraft } from '../src/contracts/turn-draft';
import { makeTile } from '../src/contracts/tile';
import { makeState, group } from './helpers';

function buildSequenceDraft(): { start: ReturnType<typeof makeState>; draft: TurnDraft } {
  const start = makeState({
    rack: [['spark', 3], ['spark', 4], ['spark', 5], ['flux', 7], ['prism', 7], ['pulse', 7]],
  });
  let draft = startDraft(start);
  draft = createGroupFromTile(draft, 't-spark-3');
  draft = moveTileToGroup(draft, 't-spark-4', 'g-1');
  draft = moveTileToGroup(draft, 't-spark-5', 'g-1');
  draft = createGroupFromTile(draft, 't-flux-7');
  draft = moveTileToGroup(draft, 't-prism-7', 'g-2');
  draft = moveTileToGroup(draft, 't-pulse-7', 'g-2');
  return { start, draft };
}

describe('commitTurn', () => {
  it('accepts a legal layout and produces a new state plus a replayable event', () => {
    const { start, draft } = buildSequenceDraft();
    const outcome = commitTurn(start, draft, 0);

    expect(outcome.ok).toBe(true);
    expect(outcome.result.kind).toBe('accepted');
    expect(outcome.state).toBeDefined();
    expect(outcome.event).toBeDefined();

    expect(outcome.state!.turn).toBe(2);
    expect(outcome.state!.table).toHaveLength(2);
    expect(outcome.event!.previousHash).toBe(start.hash);
    expect(outcome.event!.resultingHash).toBe(outcome.state!.hash);
    // The resulting hash is exactly the hash of the resulting state.
    expect(hashState(outcome.state!)).toBe(outcome.event!.resultingHash);
  });

  it('rejects an invalid layout and leaves the committed state unchanged', () => {
    const start = makeState({ rack: [['spark', 3], ['spark', 4], ['flux', 9]] });
    const startHashBefore = start.hash;
    const draft: TurnDraft = {
      startState: start,
      draftRack: [makeTile('flux', 9)],
      draftGroups: [group('g-1', [['spark', 3], ['spark', 4]])], // too short → illegal
      operations: [],
    };

    const outcome = commitTurn(start, draft, 0);
    expect(outcome.ok).toBe(false);
    expect(outcome.result.kind).toBe('invalid_group');
    expect(outcome.state).toBeUndefined();
    expect(outcome.event).toBeUndefined();
    // Committed state object was not mutated in any way.
    expect(start.hash).toBe(startHashBefore);
    expect(start.table).toHaveLength(0);
  });

  it('rejects a draft built from a stale state (version conflict)', () => {
    const { draft } = buildSequenceDraft();
    const different = makeState({ rack: [['spark', 3]] }); // different hash
    const outcome = commitTurn(different, draft, 0);
    expect(outcome.ok).toBe(false);
    expect(outcome.result.kind).toBe('state_version_conflict');
  });
});
