import { makeTile, type TileFamily } from '../src/contracts/tile';
import type { GameState, Group } from '../src/contracts/game-state';
import { RULESET_VERSION } from '../src/contracts/game-state';
import { withHash } from '../src/engine/hash-state';

export type TileSpec = [TileFamily, number];

export function group(id: string, tiles: TileSpec[]): Group {
  return { id, tiles: tiles.map(([family, value]) => makeTile(family, value)) };
}

export function makeState(opts: {
  rack?: TileSpec[];
  table?: Group[];
  turn?: number;
  activePlayer?: string;
}): GameState {
  return withHash({
    rack: (opts.rack ?? []).map(([family, value]) => makeTile(family, value)),
    table: opts.table ?? [],
    turn: opts.turn ?? 1,
    activePlayer: opts.activePlayer ?? 'player-1',
    rulesetVersion: RULESET_VERSION,
  });
}
