import type { GameState } from '../contracts/game-state';
import type { Tile } from '../contracts/tile';
import type { GameEvent } from '../contracts/game-event';
import { withHash } from '../engine/hash-state';

/**
 * Reconstruct a committed state by replaying a ledger of events.
 *
 * The full universe of tiles is fixed by the initial state, so each event only
 * needs to carry the committed groups: the rack is derived by conservation
 * (universe minus grouped tiles). Every step verifies the hash chain, so a
 * tampered or out-of-order ledger fails loudly instead of drifting silently.
 */
export function replayEvents(initial: GameState, events: readonly GameEvent[]): GameState {
  const universe: Tile[] = [
    ...initial.rack,
    ...initial.table.flatMap((g) => g.tiles),
  ];

  let state = initial;

  for (const event of events) {
    if (event.previousHash !== state.hash) {
      throw new Error(
        `Replay chain broken at turn ${event.turn}: state hash is ${state.hash}, ` +
          `event expects previous ${event.previousHash}.`,
      );
    }

    const grouped = new Set<string>(event.groups.flatMap((g) => g.tiles.map((t) => t.id)));
    const rack = universe.filter((t) => !grouped.has(t.id)).map((t) => ({ ...t }));

    const next = withHash({
      rack,
      table: event.groups.map((g) => ({ id: g.id, tiles: g.tiles.map((t) => ({ ...t })) })),
      turn: event.turn,
      activePlayer: initial.activePlayer,
      rulesetVersion: initial.rulesetVersion,
    });

    if (next.hash !== event.resultingHash) {
      throw new Error(
        `Replay produced hash ${next.hash} at turn ${event.turn}, ` +
          `but the event's resulting hash is ${event.resultingHash}.`,
      );
    }

    state = next;
  }

  return state;
}
