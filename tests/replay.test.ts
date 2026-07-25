import { describe, it, expect } from 'vitest';
import { commitTurn } from '../src/engine/commit-turn';
import { replayEvents } from '../src/replay/replay-events';
import {
  startDraft,
  createGroupFromTile,
  moveTileToGroup,
} from '../src/engine/draft-ops';
import type { GameEvent } from '../src/contracts/game-event';
import type { GameState } from '../src/contracts/game-state';
import { makeState } from './helpers';

describe('replayEvents', () => {
  it('reconstructs the final committed state and hash from the ledger', () => {
    const initial = makeState({
      rack: [['spark', 3], ['spark', 4], ['spark', 5], ['flux', 7], ['prism', 7], ['pulse', 7]],
    });

    const events: GameEvent[] = [];
    let state: GameState = initial;
    let seq = 0;

    // Turn 1 — commit the spark sequence, keep the sevens in the rack.
    {
      let draft = startDraft(state);
      draft = createGroupFromTile(draft, 't-spark-3');
      draft = moveTileToGroup(draft, 't-spark-4', 'g-1');
      draft = moveTileToGroup(draft, 't-spark-5', 'g-1');
      const outcome = commitTurn(state, draft, seq++);
      expect(outcome.ok).toBe(true);
      state = outcome.state!;
      events.push(outcome.event!);
    }

    // Turn 2 — commit the value-7 cluster.
    {
      let draft = startDraft(state);
      draft = createGroupFromTile(draft, 't-flux-7');
      draft = moveTileToGroup(draft, 't-prism-7', 'g-2');
      draft = moveTileToGroup(draft, 't-pulse-7', 'g-2');
      const outcome = commitTurn(state, draft, seq++);
      expect(outcome.ok).toBe(true);
      state = outcome.state!;
      events.push(outcome.event!);
    }

    const replayed = replayEvents(initial, events);
    expect(replayed.hash).toBe(state.hash);
    expect(replayed.table).toHaveLength(2);
    // Same tile universe accounted for (grouped + rack).
    const grouped = replayed.table.flatMap((g) => g.tiles.map((t) => t.id)).sort();
    const expected = state.table.flatMap((g) => g.tiles.map((t) => t.id)).sort();
    expect(grouped).toEqual(expected);
  });

  it('throws when the ledger hash chain is broken', () => {
    const initial = makeState({ rack: [['spark', 3], ['spark', 4], ['spark', 5]] });
    let draft = startDraft(initial);
    draft = createGroupFromTile(draft, 't-spark-3');
    draft = moveTileToGroup(draft, 't-spark-4', 'g-1');
    draft = moveTileToGroup(draft, 't-spark-5', 'g-1');
    const outcome = commitTurn(initial, draft, 0);
    const tampered: GameEvent = { ...outcome.event!, previousHash: 'deadbeef' };
    expect(() => replayEvents(initial, [tampered])).toThrow();
  });
});
