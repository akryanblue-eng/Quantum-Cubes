import { buildGesture, type DragSource, type DropTarget, type Gesture } from './gesture';

/**
 * Pointer-Events drag-and-drop, layered on top of the tap/keyboard model.
 *
 * A gesture only begins after the pointer moves past a small threshold, so a
 * quick tap still falls through to the click-based tap handler. Every completed
 * gesture is resolved to a single semantic {@link Gesture} and handed to the
 * controller, which routes it through the pure draft operations. A cancelled or
 * invalid drop changes nothing.
 */

const DRAG_THRESHOLD = 8; // px before a press becomes a drag

export interface DragHandlers {
  onGesture(gesture: Gesture): void;
}

function groupOf(el: Element): string | null {
  const body = el.closest<HTMLElement>('[data-group-body]');
  if (!body) return null;
  const id = body.dataset.groupBody ?? '';
  return id === '__rack__' ? null : id;
}

export function wireDragAndDrop(root: HTMLElement, handlers: DragHandlers): void {
  let source: DragSource | null = null;
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let suppressClick = false;

  let ghost: HTMLElement | null = null;
  let originShadow: HTMLElement | null = null;
  let overlay: SVGSVGElement | null = null;
  let tether: SVGLineElement | null = null;
  let originX = 0;
  let originY = 0;
  let ghostW = 0;
  let ghostH = 0;
  let highlighted: HTMLElement | null = null;

  function resolveTarget(el: Element | null): DropTarget | null {
    if (!el) return null;
    const newGroup = el.closest<HTMLElement>('[data-drop="new-group"]');
    if (newGroup) return { kind: 'new-group' };
    const tileEl = el.closest<HTMLElement>('[data-tile]');
    if (tileEl) return { kind: 'tile', tileId: tileEl.dataset.tile!, groupId: groupOf(tileEl) };
    const body = el.closest<HTMLElement>('[data-group-body]');
    if (body) {
      const id = body.dataset.groupBody ?? '';
      return id === '__rack__' ? { kind: 'rack' } : { kind: 'group', groupId: id };
    }
    return null;
  }

  function targetElement(el: Element | null): HTMLElement | null {
    if (!el) return null;
    return (
      el.closest<HTMLElement>('[data-drop="new-group"]') ??
      el.closest<HTMLElement>('[data-tile]') ??
      el.closest<HTMLElement>('[data-group-body]')
    );
  }

  function beginDrag(sourceEl: HTMLElement, clientX: number, clientY: number): void {
    dragging = true;
    document.body.classList.add('is-dragging');
    // Capture on the persistent root element (never removed by re-render) so the
    // pointer stream keeps flowing and never leaks onto a detached node.
    if (pointerId !== null) root.setPointerCapture?.(pointerId);

    const rect = sourceEl.getBoundingClientRect();
    ghostW = rect.width;
    ghostH = rect.height;
    originX = rect.left + rect.width / 2;
    originY = rect.top + rect.height / 2;

    ghost = sourceEl.cloneNode(true) as HTMLElement;
    ghost.classList.add('drag-ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    document.body.appendChild(ghost);

    originShadow = document.createElement('div');
    originShadow.className = 'drag-origin-shadow';
    originShadow.style.left = `${rect.left}px`;
    originShadow.style.top = `${rect.top}px`;
    originShadow.style.width = `${rect.width}px`;
    originShadow.style.height = `${rect.height}px`;
    document.body.appendChild(originShadow);

    overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    overlay.setAttribute('class', 'quantum-tether');
    tether = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    tether.setAttribute('class', 'quantum-tether-line');
    overlay.appendChild(tether);
    document.body.appendChild(overlay);

    positionGhost(clientX, clientY);
  }

  function positionGhost(clientX: number, clientY: number): void {
    if (ghost) {
      ghost.style.left = `${clientX - ghostW / 2}px`;
      ghost.style.top = `${clientY - ghostH / 2}px`;
    }
    if (tether) {
      tether.setAttribute('x1', String(originX));
      tether.setAttribute('y1', String(originY));
      tether.setAttribute('x2', String(clientX));
      tether.setAttribute('y2', String(clientY));
    }
  }

  function highlight(el: HTMLElement | null, ok: boolean): void {
    if (highlighted && highlighted !== el) {
      highlighted.classList.remove('drop-ok', 'drop-no');
    }
    if (el) {
      el.classList.remove('drop-ok', 'drop-no');
      el.classList.add(ok ? 'drop-ok' : 'drop-no');
    }
    highlighted = el;
  }

  function cleanup(): void {
    if (pointerId !== null) {
      try {
        root.releasePointerCapture?.(pointerId);
      } catch {
        // pointer already released — safe to ignore
      }
    }
    ghost?.remove();
    originShadow?.remove();
    overlay?.remove();
    highlighted?.classList.remove('drop-ok', 'drop-no');
    document.body.classList.remove('is-dragging');
    ghost = originShadow = overlay = null;
    tether = null;
    highlighted = null;
    dragging = false;
    source = null;
    pointerId = null;
  }

  root.addEventListener('pointerdown', (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const tileEl = target.closest<HTMLElement>('[data-tile]');
    const headerEl = target.closest<HTMLElement>('[data-group-header]');
    if (tileEl) {
      source = { kind: 'tile', tileId: tileEl.dataset.tile!, fromGroupId: groupOf(tileEl) };
    } else if (headerEl) {
      source = { kind: 'group', groupId: headerEl.dataset.groupHeader! };
    } else {
      return;
    }

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    dragging = false;
  });

  root.addEventListener('pointermove', (event: PointerEvent) => {
    if (!source || event.pointerId !== pointerId) return;

    if (!dragging) {
      if (Math.hypot(event.clientX - startX, event.clientY - startY) < DRAG_THRESHOLD) return;
      const sourceEl = (event.target as HTMLElement).closest<HTMLElement>(
        source.kind === 'tile' ? '[data-tile]' : '[data-group-header]',
      );
      beginDrag(sourceEl ?? (event.target as HTMLElement), startX, startY);
    }

    event.preventDefault();
    positionGhost(event.clientX, event.clientY);

    const under = document.elementFromPoint(event.clientX, event.clientY);
    const dropTarget = resolveTarget(under);
    const gesture = dropTarget ? buildGesture(source, dropTarget) : null;
    highlight(targetElement(under), gesture !== null);
  });

  function finish(event: PointerEvent, commit: boolean): void {
    if (!source || event.pointerId !== pointerId) return;
    if (!dragging) {
      // Was a tap, not a drag — let the click handler deal with it.
      source = null;
      pointerId = null;
      return;
    }

    let gesture: Gesture | null = null;
    if (commit) {
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const dropTarget = resolveTarget(under);
      gesture = dropTarget ? buildGesture(source, dropTarget) : null;
    }

    cleanup();
    suppressClick = true;
    if (gesture) handlers.onGesture(gesture);
  }

  root.addEventListener('pointerup', (event: PointerEvent) => finish(event, true));
  root.addEventListener('pointercancel', (event: PointerEvent) => finish(event, false));

  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape' && dragging) {
      cleanup();
      suppressClick = true;
    }
  });

  // Swallow the click that a browser synthesizes after a drag, so a completed
  // drag never also triggers a tap-select.
  root.addEventListener(
    'click',
    (event) => {
      if (suppressClick) {
        event.stopPropagation();
        event.preventDefault();
        suppressClick = false;
      }
    },
    true,
  );
}
