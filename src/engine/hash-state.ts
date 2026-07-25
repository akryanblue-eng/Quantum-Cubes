import type { GameState, Group } from '../contracts/game-state';
import type { Tile } from '../contracts/tile';

/**
 * Deterministic hashing of committed states.
 *
 * The canonical form is order-independent (rack and groups are sorted), so two
 * logically equal states always produce the same hash regardless of insertion
 * order. Wall-clock time is never part of the input.
 */

/** 32-bit FNV-1a, rendered as 8 lowercase hex digits. */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function tileKey(tile: Tile): string {
  return `${tile.family}${tile.value}`;
}

function sortTiles(tiles: readonly Tile[]): Tile[] {
  return [...tiles].sort((a, b) => a.value - b.value || a.family.localeCompare(b.family));
}

function canonicalGroup(group: Group): string {
  return sortTiles(group.tiles).map(tileKey).join('-');
}

/** Stable, human-inspectable canonical string for a committed state. */
export function canonicalize(state: Omit<GameState, 'hash'>): string {
  const rack = sortTiles(state.rack).map(tileKey).join(',');
  const table = state.table.map(canonicalGroup).sort().join(';');
  return [
    `ruleset:${state.rulesetVersion}`,
    `turn:${state.turn}`,
    `player:${state.activePlayer}`,
    `rack:${rack}`,
    `table:${table}`,
  ].join('|');
}

export function hashState(state: Omit<GameState, 'hash'>): string {
  return fnv1a(canonicalize(state));
}

/** Build a fully-formed GameState with its hash computed from its contents. */
export function withHash(state: Omit<GameState, 'hash'>): GameState {
  return { ...state, hash: hashState(state) };
}
