/**
 * Typed outcome of attempting to advance the committed state.
 *
 * Every rejection variant carries enough context to explain, without mutation,
 * why a draft could not be committed.
 */
export type MoveResult =
  | { readonly kind: 'accepted' }
  | { readonly kind: 'invalid_group'; readonly groupId: string; readonly reason: string }
  | { readonly kind: 'unplaced_tile'; readonly tileId: string }
  | { readonly kind: 'tile_duplicated'; readonly tileId: string }
  | { readonly kind: 'tile_missing'; readonly tileId: string }
  | { readonly kind: 'state_version_conflict'; readonly expected: string; readonly actual: string };

export type MoveResultKind = MoveResult['kind'];
