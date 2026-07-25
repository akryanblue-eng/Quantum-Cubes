import { describe, it, expect } from 'vitest';
import { validateGroup } from '../src/engine/validate-group';
import { group } from './helpers';

describe('validateGroup — Foundation Rules v0.1', () => {
  it('accepts a valid same-family consecutive sequence', () => {
    const result = validateGroup(group('g-1', [['spark', 3], ['spark', 4], ['spark', 5]]));
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.kind).toBe('sequence');
  });

  it('rejects a non-consecutive sequence', () => {
    const result = validateGroup(group('g-1', [['spark', 3], ['spark', 4], ['spark', 6]]));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/consecutive/i);
  });

  it('accepts a valid same-value distinct-family cluster', () => {
    const result = validateGroup(group('g-1', [['flux', 7], ['prism', 7], ['pulse', 7]]));
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.kind).toBe('cluster');
  });

  it('accepts a four-family cluster', () => {
    const result = validateGroup(
      group('g-1', [['spark', 10], ['flux', 10], ['prism', 10], ['pulse', 10]]),
    );
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.kind).toBe('cluster');
  });

  it('rejects a cluster with a duplicate family', () => {
    const result = validateGroup(group('g-1', [['spark', 7], ['flux', 7], ['spark', 7]]));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/family/i);
  });

  it('rejects a group with fewer than three tiles', () => {
    const result = validateGroup(group('g-1', [['spark', 3], ['spark', 4]]));
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/three/i);
  });
});
