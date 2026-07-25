import { describe, it, expect } from 'vitest';
import { generatePuzzle, generatePuzzleWithSolution } from '../src/puzzle/generate-puzzle';
import { MIN_VALUE, MAX_VALUE } from '../src/contracts/tile';

describe('puzzle generation', () => {
  it('is deterministic for a given seed', () => {
    const a = generatePuzzle(42);
    const b = generatePuzzle(42);
    expect(a.code).toBe(b.code);
    expect(a.solutionHashes).toEqual(b.solutionHashes);
    expect(a.startRack.map((t) => t.id)).toEqual(b.startRack.map((t) => t.id));
  });

  it('produces different puzzles for different seeds', () => {
    const a = generatePuzzle(1);
    const b = generatePuzzle(2);
    expect(a.startRack.map((t) => t.id).join()).not.toBe(b.startRack.map((t) => t.id).join());
  });

  it('yields well-formed racks for many seeds', () => {
    for (let seed = 0; seed < 60; seed++) {
      const { puzzle, solution } = generatePuzzleWithSolution(seed);

      // Every tile value is in range.
      for (const tile of puzzle.startRack) {
        expect(tile.value).toBeGreaterThanOrEqual(MIN_VALUE);
        expect(tile.value).toBeLessThanOrEqual(MAX_VALUE);
      }

      // No duplicate (family, value) — tile ids are globally unique.
      const ids = puzzle.startRack.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);

      // The rack is exactly the solution's tiles (conservation), scrambled.
      const solutionIds = solution.flatMap((g) => g.tiles.map((t) => t.id)).sort();
      expect([...ids].sort()).toEqual(solutionIds);

      // At least two groups, each a real (>= 3 tile) group.
      expect(solution.length).toBeGreaterThanOrEqual(2);
      for (const g of solution) expect(g.tiles.length).toBeGreaterThanOrEqual(3);
    }
  });
});
