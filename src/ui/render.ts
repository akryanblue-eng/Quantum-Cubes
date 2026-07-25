import type { GameState, Group } from '../contracts/game-state';
import type { Tile } from '../contracts/tile';
import type { TurnDraft } from '../contracts/turn-draft';
import type { GameEvent } from '../contracts/game-event';
import type { Puzzle } from '../contracts/puzzle';
import { FAMILY_LABEL } from '../contracts/tile';
import { validateGroup } from '../engine/validate-group';
import type { LayoutValidation } from '../engine/validate-layout';

export type GameMode = 'free' | 'puzzle';

/** Everything render needs to draw one frame of the app. */
export interface ViewModel {
  mode: GameMode;
  committed: GameState;
  draft: TurnDraft;
  layout: LayoutValidation;
  events: GameEvent[];
  selectedTileId: string | null;
  selectedGroupId: string | null;
  status: { tone: 'legal' | 'illegal' | 'accepted' | 'neutral'; message: string };
  puzzle: Puzzle | null;
  solved: boolean;
  solveOps: number;
  draftOps: number;
  codeError: string | null;
}

function escape(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tileButton(tile: Tile, opts: { selected: boolean; interactive: boolean }): string {
  const cls = ['tile', `family-${tile.family}`, opts.selected ? 'is-selected' : ''].join(' ').trim();
  const label = `${FAMILY_LABEL[tile.family]} ${tile.value}`;
  const tag = opts.interactive ? 'button' : 'span';
  const attrs = opts.interactive
    ? `data-tile="${tile.id}" aria-pressed="${opts.selected}"`
    : 'aria-hidden="false"';
  return (
    `<${tag} class="${cls}" ${attrs} aria-label="${escape(label)}">` +
    `<span class="tile-symbol" aria-hidden="true">${tile.symbol}</span>` +
    `<span class="tile-value">${tile.value}</span>` +
    `<span class="sr-only">${escape(label)}</span>` +
    `</${tag}>`
  );
}

function committedGroup(group: Group): string {
  const validation = validateGroup(group);
  const badge = validation.valid
    ? `<span class="badge legal">✓ ${validation.kind}</span>`
    : `<span class="badge illegal">✗ illegal</span>`;
  const tiles = group.tiles.map((t) => tileButton(t, { selected: false, interactive: false })).join('');
  return `<li class="group committed-group">${badge}<div class="group-tiles">${tiles}</div></li>`;
}

function draftGroup(
  group: Group,
  vm: ViewModel,
): string {
  const validation = vm.layout.groupResults[group.id] ?? validateGroup(group);
  const legal = validation.valid;
  const badge = legal
    ? `<span class="badge legal">✓ ${validation.kind}</span>`
    : `<span class="badge illegal">✗ ${escape(validation.reason)}</span>`;
  const headerSelected = vm.selectedGroupId === group.id;
  const tiles = group.tiles
    .map((t) => tileButton(t, { selected: vm.selectedTileId === t.id, interactive: true }))
    .join('');
  return (
    `<li class="group draft-group ${legal ? 'legal' : 'illegal'}">` +
    `<button class="group-header ${headerSelected ? 'is-selected' : ''}" ` +
    `data-group-header="${group.id}" aria-pressed="${headerSelected}">` +
    `<span class="group-name">Group ${escape(group.id.replace('g-', ''))}</span>${badge}</button>` +
    `<button class="group-body" data-group-body="${group.id}" ` +
    `aria-label="Move selected tile into group ${escape(group.id)}">` +
    `<div class="group-tiles">${tiles || '<span class="empty-hint">tap to drop</span>'}</div>` +
    `</button>` +
    `</li>`
  );
}

function ledger(events: GameEvent[]): string {
  if (events.length === 0) {
    return '<p class="ledger-empty">No commits yet. Your accepted layouts will appear here.</p>';
  }
  const rows = [...events]
    .reverse()
    .map(
      (e) =>
        `<li class="ledger-row"><span class="ledger-turn">Turn ${e.turn}</span>` +
        `<span class="ledger-groups">${e.groups.length} group(s)</span>` +
        `<code class="ledger-hash" title="resulting-state hash">${escape(e.resultingHash)}</code></li>`,
    )
    .join('');
  return `<ol class="ledger-list">${rows}</ol>`;
}

function modeSwitch(vm: ViewModel): string {
  const btn = (mode: GameMode, label: string) =>
    `<button class="mode-btn ${vm.mode === mode ? 'is-active' : ''}" data-action="mode-${mode}" ` +
    `aria-pressed="${vm.mode === mode}">${label}</button>`;
  return `<div class="mode-switch" role="group" aria-label="Game mode">${btn('free', 'Free Play')}${btn('puzzle', 'Puzzle')}</div>`;
}

function puzzlePanel(vm: ViewModel): string {
  if (vm.mode !== 'puzzle') return '';
  const code = vm.puzzle ? escape(vm.puzzle.code) : '—';
  const victory = vm.solved
    ? `<div class="victory" role="status" aria-live="assertive">🎉 Puzzle solved in ${vm.solveOps} operation(s)! Press “New puzzle” to keep going.</div>`
    : '';
  const err = vm.codeError
    ? `<p class="code-error" role="alert">${escape(vm.codeError)}</p>`
    : '';
  return `
    <section class="panel puzzle-panel" aria-labelledby="puzzle-title">
      <h2 id="puzzle-title">Puzzle</h2>
      <p class="objective">Objective: place <strong>every tile</strong> into legal groups and commit once to <strong>clear your rack</strong>.</p>
      <div class="puzzle-code-row">
        <span class="puzzle-code" aria-label="Puzzle code">${code}</span>
        <button data-action="copy-code" aria-label="Copy puzzle code">Copy</button>
      </div>
      <p class="ops-counter">Operations this attempt: <strong>${vm.solved ? vm.solveOps : vm.draftOps}</strong></p>
      ${victory}
      <div class="puzzle-tools" role="group" aria-label="Puzzle actions">
        <button data-action="new-puzzle">New puzzle</button>
        <button data-action="restart-puzzle">Restart</button>
      </div>
      <div class="load-code">
        <label for="puzzle-code-input">Load a shared code</label>
        <div class="load-code-row">
          <input id="puzzle-code-input" type="text" inputmode="text" autocomplete="off"
            placeholder="QC1-…" aria-label="Puzzle code to load" />
          <button data-action="load-code">Load</button>
        </div>
        ${err}
      </div>
    </section>
  `;
}

export function renderApp(vm: ViewModel): string {
  const rackTiles = vm.draft.draftRack
    .map((t) => tileButton(t, { selected: vm.selectedTileId === t.id, interactive: true }))
    .join('');

  const committedTable =
    vm.committed.table.length === 0
      ? '<p class="empty-hint">The committed table is empty.</p>'
      : `<ul class="group-list">${vm.committed.table.map(committedGroup).join('')}</ul>`;

  const draftGroups =
    vm.draft.draftGroups.length === 0
      ? '<p class="empty-hint">No draft groups yet. Select a tile and tap “New group”.</p>'
      : `<ul class="group-list">${vm.draft.draftGroups.map((g) => draftGroup(g, vm)).join('')}</ul>`;

  const commitDisabled = vm.layout.legal && !(vm.mode === 'puzzle' && vm.solved) ? '' : 'disabled';

  return `
    <header class="app-header">
      <h1>Quantum&nbsp;Cubes</h1>
      <p class="tagline">Experiment freely. Commit atomically.</p>
      ${modeSwitch(vm)}
    </header>

    ${puzzlePanel(vm)}

    <section class="panel committed" aria-labelledby="committed-title">
      <h2 id="committed-title">Committed table <span class="turn">turn ${vm.committed.turn}</span></h2>
      <p class="panel-note">Locked. Changes here only through a validated commit.</p>
      ${committedTable}
    </section>

    <section class="panel sandbox" aria-labelledby="sandbox-title">
      <h2 id="sandbox-title">Quantum Sandbox</h2>
      <p class="panel-note">A protected draft space. Nothing here is real until you commit.</p>

      <div class="sandbox-tools" role="group" aria-label="Sandbox actions">
        <button data-action="new-group">＋ New group</button>
        <button data-action="split">Split out</button>
        <button data-action="to-rack">To rack</button>
        <button data-action="reset" class="danger">Reset turn</button>
      </div>

      <div class="draft-groups">${draftGroups}</div>

      <div class="rack" aria-labelledby="rack-title">
        <div class="rack-head">
          <h3 id="rack-title">Your rack</h3>
          <div class="rack-sort" role="group" aria-label="Sort rack">
            <button data-action="sort-value">Sort · value</button>
            <button data-action="sort-family">Sort · family</button>
          </div>
        </div>
        <button class="rack-drop" data-group-body="__rack__" aria-label="Move selected tile to rack">
          <div class="group-tiles rack-tiles">${rackTiles || '<span class="empty-hint">rack empty</span>'}</div>
        </button>
      </div>
    </section>

    <section class="panel commit-bar" aria-labelledby="commit-title">
      <h2 id="commit-title" class="sr-only">Commit</h2>
      <p class="status status-${vm.status.tone}" role="status" aria-live="polite">${escape(vm.status.message)}</p>
      <button class="commit" data-action="commit" ${commitDisabled}>Commit layout</button>
    </section>

    <section class="panel ledger" aria-labelledby="ledger-title">
      <h2 id="ledger-title">Event ledger</h2>
      ${ledger(vm.events)}
    </section>

    <footer class="app-footer">
      <p>Quantum Cubes Foundation Rules v0.1 — an original game. Not affiliated with any commercial tile game.</p>
    </footer>
  `;
}
