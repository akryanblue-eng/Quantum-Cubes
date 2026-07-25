import { describe, it, expect } from 'vitest';
import { validateLayout } from '../src/engine/validate-layout';
import type { TurnDraft } from '../src/contracts/turn-draft';
import { makeTile } from '../src/contracts/tile';
import { makeState, group } from './helpers';

describe('validateLayout', () => {
  it('accepts a legal layout that conserves the turn-start tiles', () => {
    const start = makeState({ rack: [['spark', 3], ['spark', 4], ['spark', 5]] });
    const draft: TurnDraft = {
      startState: start,
      draftRack: [],
      draftGroups: [group('g-1', [['spark', 3], ['spark', 4], ['spark', 5]])],
      operations: [],
    };
    const result = validateLayout(draft);
    expect(result.legal).toBe(true);
    expect(result.result.kind).toBe('accepted');
  });

  it('detects a duplicated tile', () => {
    const start = makeState({ rack: [['spark', 3], ['spark', 4], ['spark', 5]] });
    const draft: TurnDraft = {
      startState: start,
      // spark-3 appears both in the rack and inside a group.
      draftRack: [makeTile('spark', 3)],
      draftGroups: [group('g-1', [['spark', 3], ['spark', 4], ['spark', 5]])],
      operations: [],
    };
    const result = validateLayout(draft);
    expect(result.legal).toBe(false);
    expect(result.result.kind).toBe('tile_duplicated');
  });

  it('detects a missing (lost) tile', () => {
    const start = makeState({ rack: [['spark', 3], ['spark', 4], ['spark', 5]] });
    const draft: TurnDraft = {
      startState: start,
      // spark-5 has vanished entirely.
      draftRack: [makeTile('spark', 3), makeTile('spark', 4)],
      draftGroups: [],
      operations: [],
    };
    const result = validateLayout(draft);
    expect(result.legal).toBe(false);
    expect(result.result.kind).toBe('tile_missing');
  });

  it('reports an invalid group with a specific reason', () => {
    const start = makeState({ rack: [['spark', 3], ['spark', 4], ['flux', 9]] });
    const draft: TurnDraft = {
      startState: start,
      draftRack: [makeTile('flux', 9)],
      draftGroups: [group('g-1', [['spark', 3], ['spark', 4]])],
      operations: [],
    };
    const result = validateLayout(draft);
    expect(result.legal).toBe(false);
    expect(result.result.kind).toBe('invalid_group');
  });
});
