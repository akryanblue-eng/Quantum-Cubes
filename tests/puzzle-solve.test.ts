import { describe, it, expect } from 'vitest';
import {
  generatePuzzleWithSolution,
  puzzleStartState,
  isPuzzleSolved,
} from '../src/puzzle/generate-puzzle';
import { commitTurn } from '../src/engine/commit-turn';
import type { TurnDraft } from '../src/contracts/turn-draft';
import type { Group } from '../src/contracts/game-state';

function cloneGroups(groups: Group[]): Group[] {
  return groups.map((g) => ({ id: g.id, tiles: g.tiles.map((t) => ({ ...t })) }));
}

describe('puzzle victory — clear the rack', () => {
  it('committing the full solution clears the rack and wins, for many seeds', () => {
    for (let seed = 0; seed < 60; seed++) {
      const { puzzle, solution } = generatePuzzleWithSolution(seed);
      const start = puzzleStartState(puzzle);

      const draft: TurnDraft = {
        startState: start,
        draftRack: [],
        draftGroups: cloneGroups(solution),
        operations: [],
      };

      const outcome = commitTurn(start, draft, 0);
      expect(outcome.ok).toBe(true);
      expect(outcome.state!.rack).toHaveLength(0);
      expect(isPuzzleSolved(outcome.state!)).toBe(true);
      // The winning commit's hash is a known canonical-solution hash.
      expect(puzzle.solutionHashes).toContain(outcome.state!.hash);
    }
  });

  it('a partial commit that leaves tiles in the rack does not win', () => {
    const { puzzle, solution } = generatePuzzleWithSolution(7);
    const start = puzzleStartState(puzzle);

    // Commit only the first group; leave the remaining tiles in the rack.
    const [first, ...rest] = solution;
    const draft: TurnDraft = {
      startState: start,
      draftRack: rest.flatMap((g) => g.tiles.map((t) => ({ ...t }))),
      draftGroups: cloneGroups([first]),
      operations: [],
    };

    const outcome = commitTurn(start, draft, 0);
    expect(outcome.ok).toBe(true); // legal, just not a full clear
    expect(outcome.state!.rack.length).toBeGreaterThan(0);
    expect(isPuzzleSolved(outcome.state!)).toBe(false);
  });
});
