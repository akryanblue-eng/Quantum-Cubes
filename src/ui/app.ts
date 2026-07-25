import '../styles/app.css';

import type { GameState } from '../contracts/game-state';
import type { TurnDraft } from '../contracts/turn-draft';
import type { GameEvent } from '../contracts/game-event';
import type { MoveResult } from '../contracts/move-result';
import type { Puzzle } from '../contracts/puzzle';
import { createInitialState } from '../engine/initial-state';
import { validateLayout, type LayoutValidation } from '../engine/validate-layout';
import { commitTurn } from '../engine/commit-turn';
import {
  startDraft,
  resetDraft,
  moveTileToGroup,
  moveTileToRack,
  createGroupFromTile,
  splitTileToNewGroup,
  mergeGroups,
  sortRackByValue,
  sortRackByFamily,
} from '../engine/draft-ops';
import {
  generatePuzzle,
  puzzleStartState,
  isPuzzleSolved,
} from '../puzzle/generate-puzzle';
import { decodePuzzleCode } from '../puzzle/puzzle-code';
import { renderApp, type ViewModel, type GameMode } from './render';
import { wireInteractions } from './interactions';

const RACK_DROP_ID = '__rack__';

function describeRejection(result: MoveResult): string {
  switch (result.kind) {
    case 'invalid_group':
      return `Illegal group: ${result.reason}`;
    case 'tile_duplicated':
      return 'A tile appears twice in the layout.';
    case 'tile_missing':
      return 'The layout is missing a tile or references an unknown one.';
    case 'unplaced_tile':
      return 'A tile still needs a home.';
    case 'state_version_conflict':
      return 'The committed state changed underneath this draft.';
    case 'accepted':
      return 'Layout is legal.';
  }
}

function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

class QuantumCubesController {
  private mode: GameMode = 'free';
  private committed!: GameState;
  private draft!: TurnDraft;
  private events: GameEvent[] = [];
  private layout!: LayoutValidation;
  private selectedTileId: string | null = null;
  private selectedGroupId: string | null = null;
  private status: ViewModel['status'] = { tone: 'neutral', message: 'Select a tile to begin.' };
  private sequence = 0;

  private puzzle: Puzzle | null = null;
  private solved = false;
  private solveOps = 0;
  private codeError: string | null = null;

  constructor(private readonly root: HTMLElement) {
    wireInteractions(this.root, {
      selectTile: (id) => this.selectTile(id),
      tapGroupBody: (id) => this.tapGroupBody(id),
      tapGroupHeader: (id) => this.tapGroupHeader(id),
      action: (name) => this.action(name),
    });
    this.loadFreePlay();
  }

  // ---- Mode loading ----

  private loadFreePlay(): void {
    this.mode = 'free';
    this.puzzle = null;
    this.solved = false;
    this.committed = createInitialState();
    this.resetTurnState({ tone: 'neutral', message: 'Free Play — arrange tiles and commit.' });
  }

  private loadPuzzle(seed: number): void {
    this.mode = 'puzzle';
    this.puzzle = generatePuzzle(seed);
    this.solved = false;
    this.solveOps = 0;
    this.codeError = null;
    this.committed = puzzleStartState(this.puzzle);
    this.resetTurnState({ tone: 'neutral', message: 'Clear your rack in one legal commit to win.' });
  }

  private resetTurnState(status: ViewModel['status']): void {
    this.draft = startDraft(this.committed);
    this.layout = validateLayout(this.draft);
    this.events = [];
    this.selectedTileId = null;
    this.selectedGroupId = null;
    this.status = status;
    this.render();
  }

  // ---- Tile / group interactions ----

  private selectTile(tileId: string): void {
    this.selectedGroupId = null;
    this.selectedTileId = this.selectedTileId === tileId ? null : tileId;
    this.render();
  }

  private tapGroupBody(groupId: string): void {
    if (!this.selectedTileId) {
      this.setNeutral('Select a tile first, then tap a destination.');
      return;
    }
    this.draft =
      groupId === RACK_DROP_ID
        ? moveTileToRack(this.draft, this.selectedTileId)
        : moveTileToGroup(this.draft, this.selectedTileId, groupId);
    this.selectedTileId = null;
    this.afterMutation();
  }

  private tapGroupHeader(groupId: string): void {
    if (this.selectedGroupId && this.selectedGroupId !== groupId) {
      this.draft = mergeGroups(this.draft, this.selectedGroupId, groupId);
      this.selectedGroupId = null;
      this.afterMutation();
      return;
    }
    this.selectedGroupId = this.selectedGroupId === groupId ? null : groupId;
    this.selectedTileId = null;
    this.setNeutral(
      this.selectedGroupId
        ? 'Group selected. Tap another group to merge them.'
        : 'Select a tile to begin.',
    );
  }

  // ---- Actions ----

  private action(name: string): void {
    switch (name) {
      case 'new-group':
        this.requireTile((id) => (this.draft = createGroupFromTile(this.draft, id)));
        break;
      case 'split':
        this.requireTile((id) => (this.draft = splitTileToNewGroup(this.draft, id)));
        break;
      case 'to-rack':
        this.requireTile((id) => (this.draft = moveTileToRack(this.draft, id)));
        break;
      case 'sort-value':
        this.draft = sortRackByValue(this.draft);
        this.afterMutation();
        break;
      case 'sort-family':
        this.draft = sortRackByFamily(this.draft);
        this.afterMutation();
        break;
      case 'reset':
        this.draft = resetDraft(this.draft);
        this.selectedTileId = null;
        this.selectedGroupId = null;
        this.layout = validateLayout(this.draft);
        this.status = { tone: 'neutral', message: 'Turn reset to the committed state.' };
        this.render();
        break;
      case 'commit':
        this.commit();
        break;
      case 'mode-free':
        this.loadFreePlay();
        break;
      case 'mode-puzzle':
        this.loadPuzzle(randomSeed());
        break;
      case 'new-puzzle':
        this.loadPuzzle(randomSeed());
        break;
      case 'restart-puzzle':
        if (this.puzzle) this.loadPuzzle(this.puzzle.seed);
        break;
      case 'load-code':
        this.loadCode();
        break;
      case 'copy-code':
        this.copyCode();
        break;
    }
  }

  private requireTile(op: (tileId: string) => void): void {
    if (!this.selectedTileId) {
      this.setNeutral('Select a tile first.');
      return;
    }
    op(this.selectedTileId);
    this.selectedTileId = null;
    this.afterMutation();
  }

  private loadCode(): void {
    const input = this.root.querySelector<HTMLInputElement>('#puzzle-code-input');
    const raw = input?.value ?? '';
    if (!raw.trim()) {
      this.codeError = 'Enter a puzzle code first.';
      this.render();
      return;
    }
    const seed = decodePuzzleCode(raw);
    if (seed === null) {
      this.codeError = 'That code is not valid.';
      this.render();
      return;
    }
    this.loadPuzzle(seed);
  }

  private copyCode(): void {
    if (!this.puzzle) return;
    const code = this.puzzle.code;
    void navigator.clipboard?.writeText(code).then(
      () => this.setNeutral(`Copied ${code} to clipboard.`),
      () => this.setNeutral(`Puzzle code: ${code}`),
    );
  }

  private commit(): void {
    const opsUsed = this.draft.operations.length;
    const outcome = commitTurn(this.committed, this.draft, this.sequence);
    if (!outcome.ok || !outcome.state || !outcome.event) {
      this.status = { tone: 'illegal', message: `Rejected — ${describeRejection(outcome.result)}` };
      this.render();
      return;
    }
    this.sequence += 1;
    this.committed = outcome.state;
    this.events = [...this.events, outcome.event];
    this.draft = startDraft(this.committed);
    this.selectedTileId = null;
    this.selectedGroupId = null;
    this.layout = validateLayout(this.draft);

    if (this.mode === 'puzzle' && isPuzzleSolved(this.committed)) {
      this.solved = true;
      this.solveOps = opsUsed;
      this.status = { tone: 'accepted', message: `🎉 Solved in ${opsUsed} operation(s)!` };
    } else {
      this.status = {
        tone: 'accepted',
        message: `Committed. Table hash ${outcome.event.resultingHash}.`,
      };
    }
    this.render();
  }

  private afterMutation(): void {
    this.layout = validateLayout(this.draft);
    this.status = this.layout.legal
      ? { tone: 'legal', message: 'Layout is legal — ready to commit.' }
      : { tone: 'illegal', message: describeRejection(this.layout.result) };
    this.render();
  }

  private setNeutral(message: string): void {
    this.status = { tone: 'neutral', message };
    this.render();
  }

  private render(): void {
    const vm: ViewModel = {
      mode: this.mode,
      committed: this.committed,
      draft: this.draft,
      layout: this.layout,
      events: this.events,
      selectedTileId: this.selectedTileId,
      selectedGroupId: this.selectedGroupId,
      status: this.status,
      puzzle: this.puzzle,
      solved: this.solved,
      solveOps: this.solveOps,
      draftOps: this.draft.operations.length,
      codeError: this.codeError,
    };
    this.root.innerHTML = renderApp(vm);
  }
}

const mount = document.getElementById('app');
if (mount) {
  new QuantumCubesController(mount);
}
