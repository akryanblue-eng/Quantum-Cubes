import { describe, it, expect } from 'vitest';
import { hashState } from '../src/engine/hash-state';
import { makeState, group } from './helpers';

describe('hashState — deterministic committed-state hashing', () => {
  it('produces the same hash for the same state', () => {
    const a = makeState({ rack: [['spark', 3], ['spark', 4]], turn: 2 });
    const b = makeState({ rack: [['spark', 3], ['spark', 4]], turn: 2 });
    expect(hashState(a)).toBe(hashState(b));
    expect(a.hash).toBe(b.hash);
  });

  it('is independent of rack ordering', () => {
    const a = makeState({ rack: [['spark', 3], ['flux', 9], ['prism', 2]] });
    const b = makeState({ rack: [['prism', 2], ['spark', 3], ['flux', 9]] });
    expect(a.hash).toBe(b.hash);
  });

  it('is independent of group ordering on the table', () => {
    const seq = group('g-1', [['spark', 3], ['spark', 4], ['spark', 5]]);
    const cluster = group('g-2', [['flux', 7], ['prism', 7], ['pulse', 7]]);
    const a = makeState({ table: [seq, cluster] });
    const b = makeState({ table: [cluster, seq] });
    expect(a.hash).toBe(b.hash);
  });

  it('changes when the state changes', () => {
    const a = makeState({ rack: [['spark', 3], ['spark', 4]] });
    const b = makeState({ rack: [['spark', 3], ['spark', 5]] });
    expect(a.hash).not.toBe(b.hash);
  });
});
