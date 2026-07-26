# Mobile Interaction Spec

Quantum Cubes is designed for a phone first. The interface must make four things
obvious at a glance and one thing safe to do at any time.

## What the player must always understand

1. **What is committed** — the locked, always-legal table (top panel).
2. **What is still experimental** — the Quantum Sandbox draft (middle panel).
3. **Whether the current draft is legal** — per-group badges plus a single
   status line above the Commit button.
4. **What Commit will change** — the draft groups are exactly what becomes the
   new committed table.

…and one thing that must always be safe:

5. **How to undo everything** — the **Reset turn** button restores the exact
   turn-start state.

## Interaction model (tap-based)

The prototype uses tap interactions (no drag dependency), which are reliable on
touch screens and keyboard-operable:

- **Select a tile** — tap it. The selected tile is outlined.
- **Move the selected tile** — tap a destination: a group body, the rack, or
  **＋ New group**.
- **Split** — with a grouped tile selected, tap **Split out** to move it into a
  fresh group of its own.
- **Merge** — tap a group header to select it, then tap another group header to
  merge the two.
- **Sort the rack** — **Sort · value** or **Sort · family**.

## Drag-and-drop (v0.2.1)

Drag is layered **on top of** tap and keyboard, never replacing them. It uses
Pointer Events (not HTML5 drag-and-drop) so it works consistently across touch
and mouse.

- A press only becomes a drag after the pointer moves past a small threshold, so
  a quick tap still falls through to tap-select.
- **Drag a tile** from the rack or a group onto:
  - a group → move it into that group,
  - another tile in the same group → reorder,
  - the rack → return it to the rack,
  - the "start a new group" drop zone → split it into a new group.
- **Drag a group header** onto another group → merge them.
- A faint **quantum tether** and an origin shadow show where the dragged tile
  came from until the drop resolves.
- Valid drop targets are outlined; an invalid target shows a dashed warning.
- Releasing outside any target, or pressing **Escape** mid-drag, cancels with no
  change — rejected drops snap back.

Every completed gesture is routed through the same pure draft operations as tap
and keyboard, so **one completed drag counts as exactly one operation**, and the
committed state is never touched until an atomic commit.

Implementation notes: the pointer is captured on the persistent root element (so
a mid-drag re-render can't strip the event stream), and the rack and group drop
zones are `div role="button"` (not `<button>`) so tile buttons can nest inside
them as valid HTML while remaining keyboard-operable via Enter/Space. Interactive
tiles nested inside a role="button" drop zone is a deliberate, documented
trade-off to keep keyboard "drop into this group" working in this slice.

## Accessibility requirements

- **Color + symbol**: every tile shows its family symbol and value, so legality
  and identity never depend on color alone.
- **Large touch targets**: interactive controls are at least 48×48 px.
- **Visible selection states**: selected tiles and groups have a clear outline.
- **Status text**: legal / illegal status is always announced in words via an
  `aria-live` region, not by color only.
- **Keyboard operable**: tiles and controls are real `<button>` elements.
- **Reduced motion**: `prefers-reduced-motion` disables transitions and
  transforms.

## Layout

Single scrolling column, max width 640 px, with a sticky commit bar so the
Commit button and status line stay reachable on small viewports.
