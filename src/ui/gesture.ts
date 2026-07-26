import type { TurnDraft } from '../contracts/turn-draft';
import {
  moveTileToGroup,
  moveTileToRack,
  createGroupFromTile,
  splitTileToNewGroup,
  mergeGroups,
  reorderWithinGroup,
} from '../engine/draft-ops';

/**
 * Pure translation of a completed drag gesture into a single draft operation.
 *
 * The DOM drag controller is intentionally thin: it observes pointer events,
 * builds a {@link DragSource} and {@link DropTarget}, and asks this module what
 * a completed gesture means. All state changes still flow through the existing
 * pure draft operations, so drag, tap, and keyboard share one code path and one
 * definition of "one operation".
 */

export type DragSource =
  | { readonly kind: 'tile'; readonly tileId: string; readonly fromGroupId: string | null }
  | { readonly kind: 'group'; readonly groupId: string };

export type DropTarget =
  | { readonly kind: 'group'; readonly groupId: string }
  | { readonly kind: 'rack' }
  | { readonly kind: 'new-group' }
  | { readonly kind: 'tile'; readonly tileId: string; readonly groupId: string | null };

export type Gesture =
  | { readonly kind: 'tile-to-group'; readonly tileId: string; readonly groupId: string }
  | { readonly kind: 'tile-to-rack'; readonly tileId: string }
  | { readonly kind: 'tile-to-new-group'; readonly tileId: string }
  | {
      readonly kind: 'reorder-within-group';
      readonly groupId: string;
      readonly tileId: string;
      readonly beforeTileId: string;
    }
  | { readonly kind: 'merge-groups'; readonly sourceGroupId: string; readonly targetGroupId: string };

/**
 * Decide what a drop means, or null for a no-op (dropped where it already is, or
 * onto an invalid target). Returning null lets the controller "snap back"
 * without touching state or the operation count.
 */
export function buildGesture(source: DragSource, target: DropTarget): Gesture | null {
  if (source.kind === 'tile') {
    const tileId = source.tileId;
    switch (target.kind) {
      case 'group':
        return source.fromGroupId === target.groupId
          ? null
          : { kind: 'tile-to-group', tileId, groupId: target.groupId };
      case 'rack':
        return source.fromGroupId === null ? null : { kind: 'tile-to-rack', tileId };
      case 'new-group':
        return { kind: 'tile-to-new-group', tileId };
      case 'tile': {
        if (target.tileId === tileId) return null;
        if (target.groupId === null) {
          // Dropped onto a tile sitting in the rack → move to rack.
          return source.fromGroupId === null ? null : { kind: 'tile-to-rack', tileId };
        }
        if (target.groupId === source.fromGroupId) {
          return {
            kind: 'reorder-within-group',
            groupId: target.groupId,
            tileId,
            beforeTileId: target.tileId,
          };
        }
        return { kind: 'tile-to-group', tileId, groupId: target.groupId };
      }
    }
  }

  // Group source → merge onto another group.
  const sourceGroupId = source.groupId;
  if (target.kind === 'group') {
    return target.groupId === sourceGroupId
      ? null
      : { kind: 'merge-groups', sourceGroupId, targetGroupId: target.groupId };
  }
  if (target.kind === 'tile' && target.groupId !== null && target.groupId !== sourceGroupId) {
    return { kind: 'merge-groups', sourceGroupId, targetGroupId: target.groupId };
  }
  return null;
}

/**
 * Apply a gesture through the pure draft operations. Returns the next draft and
 * whether anything actually changed (draft operations return the same reference
 * on a no-op).
 */
export function applyGesture(draft: TurnDraft, gesture: Gesture): { draft: TurnDraft; changed: boolean } {
  let next = draft;
  switch (gesture.kind) {
    case 'tile-to-group':
      next = moveTileToGroup(draft, gesture.tileId, gesture.groupId);
      break;
    case 'tile-to-rack':
      next = moveTileToRack(draft, gesture.tileId);
      break;
    case 'tile-to-new-group': {
      const inRack = draft.draftRack.some((t) => t.id === gesture.tileId);
      next = inRack
        ? createGroupFromTile(draft, gesture.tileId)
        : splitTileToNewGroup(draft, gesture.tileId);
      break;
    }
    case 'reorder-within-group':
      next = reorderWithinGroup(draft, gesture.groupId, gesture.tileId, gesture.beforeTileId);
      break;
    case 'merge-groups':
      next = mergeGroups(draft, gesture.sourceGroupId, gesture.targetGroupId);
      break;
  }
  return { draft: next, changed: next !== draft };
}
