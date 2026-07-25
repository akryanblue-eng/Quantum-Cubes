/**
 * DOM event wiring for the Quantum Cubes prototype.
 *
 * Interactions are tap-based and delegated from a single root listener, so the
 * whole view can be re-rendered from strings without rebinding handlers. All
 * game logic lives in the controller; this module only translates taps into
 * controller intents.
 */
export interface InteractionHandlers {
  selectTile(tileId: string): void;
  tapGroupBody(groupId: string): void;
  tapGroupHeader(groupId: string): void;
  action(name: string): void;
}

export function wireInteractions(root: HTMLElement, handlers: InteractionHandlers): void {
  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const tile = target.closest<HTMLElement>('[data-tile]');
    if (tile) {
      handlers.selectTile(tile.dataset.tile!);
      return;
    }

    const body = target.closest<HTMLElement>('[data-group-body]');
    if (body) {
      handlers.tapGroupBody(body.dataset.groupBody!);
      return;
    }

    const header = target.closest<HTMLElement>('[data-group-header]');
    if (header) {
      handlers.tapGroupHeader(header.dataset.groupHeader!);
      return;
    }

    const actionEl = target.closest<HTMLElement>('[data-action]');
    if (actionEl) {
      handlers.action(actionEl.dataset.action!);
    }
  });
}
