/**
 * Tile contract for Quantum Cubes.
 *
 * A tile carries both a color-bearing `family` and an accessibility `symbol`
 * so that identity never depends on color alone (see Foundation Rules v0.1).
 */

export type TileFamily = 'spark' | 'flux' | 'prism' | 'pulse';

export const TILE_FAMILIES: readonly TileFamily[] = ['spark', 'flux', 'prism', 'pulse'] as const;

/** Lowest and highest numeric value a tile may carry. */
export const MIN_VALUE = 1;
export const MAX_VALUE = 13;

/** Accessibility symbol per family — legality and identity must not rely on color. */
export const FAMILY_SYMBOL: Record<TileFamily, string> = {
  spark: '◆',
  flux: '●',
  prism: '▲',
  pulse: '■',
};

/** Human-readable family label for UI and documentation. */
export const FAMILY_LABEL: Record<TileFamily, string> = {
  spark: 'Spark',
  flux: 'Flux',
  prism: 'Prism',
  pulse: 'Pulse',
};

export interface Tile {
  /** Stable unique identifier (stable across a match). */
  readonly id: string;
  readonly family: TileFamily;
  readonly value: number;
  /** Accessibility symbol, derived from the family. */
  readonly symbol: string;
}

/**
 * Build a tile with a stable, deterministic id.
 *
 * Within a single match every (family, value) pair is unique, so the id
 * `t-<family>-<value>` is both stable and unique.
 */
export function makeTile(family: TileFamily, value: number): Tile {
  return { id: `t-${family}-${value}`, family, value, symbol: FAMILY_SYMBOL[family] };
}
