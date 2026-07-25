import type { Group } from '../contracts/game-state';
import type { Tile } from '../contracts/tile';

/**
 * Group validation for Quantum Cubes Foundation Rules v0.1.
 *
 * A legal group is exactly one of:
 *
 *   Sequence — 3+ tiles, same family, consecutive values, no duplicate values.
 *   Cluster  — 3 or 4 tiles, same value, every tile from a different family.
 */

export type GroupKind = 'sequence' | 'cluster';

export type GroupValidation =
  | { readonly valid: true; readonly kind: GroupKind }
  | { readonly valid: false; readonly reason: string };

function validateSequence(tiles: readonly Tile[]): GroupValidation {
  if (!tiles.every((t) => t.family === tiles[0].family)) {
    return { valid: false, reason: 'A sequence must be a single family.' };
  }
  const values = tiles.map((t) => t.value);
  if (new Set(values).size !== values.length) {
    return { valid: false, reason: 'A sequence cannot repeat a value.' };
  }
  const sorted = [...values].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      return { valid: false, reason: 'A sequence must run through consecutive values.' };
    }
  }
  return { valid: true, kind: 'sequence' };
}

function validateCluster(tiles: readonly Tile[]): GroupValidation {
  if (tiles.length > 4) {
    return { valid: false, reason: 'A cluster may hold at most four tiles.' };
  }
  if (!tiles.every((t) => t.value === tiles[0].value)) {
    return { valid: false, reason: 'A cluster must share one value.' };
  }
  const families = tiles.map((t) => t.family);
  if (new Set(families).size !== families.length) {
    return { valid: false, reason: 'A cluster cannot repeat a family.' };
  }
  return { valid: true, kind: 'cluster' };
}

/**
 * Validate a single group. Chooses the intended shape from the tile makeup so
 * that the returned reason is specific and useful for live feedback.
 */
export function validateGroup(group: Group): GroupValidation {
  const tiles = group.tiles;
  if (tiles.length < 3) {
    return { valid: false, reason: 'A group needs at least three tiles.' };
  }

  const sameFamily = tiles.every((t) => t.family === tiles[0].family);
  const sameValue = tiles.every((t) => t.value === tiles[0].value);

  if (sameFamily && !sameValue) return validateSequence(tiles);
  if (sameValue && !sameFamily) return validateCluster(tiles);

  // Ambiguous makeup: try both shapes before giving up.
  const asSequence = validateSequence(tiles);
  if (asSequence.valid) return asSequence;
  const asCluster = validateCluster(tiles);
  if (asCluster.valid) return asCluster;

  return {
    valid: false,
    reason:
      'Not a legal Sequence (same family, consecutive values) or Cluster (same value, distinct families).',
  };
}
