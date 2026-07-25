import '../styles/app.css';

import type { GameState } from '../contracts/game-state';
import type { TurnDraft } from '../contracts/turn-draft';
import type { GameEvent } from '../contracts/game-event';
import type { MoveResult } from '../contracts/move-result';
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
import { renderApp, type ViewModel } from './render';
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

class QuantumCubesController {
  private committed: GameState;
  private draft: TurnDraft;
  private events: GameEvent[] = [];
  private layout: LayoutValidation;
  private selectedTileId: string | null = null;
  private selectedGroupId: string | null = null;
  private status: ViewModel['status'] = { tone: 'neutral', message: 'Select a tile to begin.' };
  private sequence = 0;

  constructor(private readonly root: HTMLElement) {
    this.committed = createInitialState();
    this.draft = startDraft(this.committed);
    this.layout = validateLayout(this.draft);
    wireInteractions(this.root, {
      selectTile: (id) => this.selectTile(id),
      tapGroupBody: (id) => this.tapGroupBody(id),
      tapGroupHeader: (id) => this.tapGroupHeader(id),
      action: (name) => this.action(name),
    });
    this.render();
  }

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

  private commit(): void {
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
    this.status = {
      tone: 'accepted',
      message: `Committed. Table hash ${outcome.event.resultingHash}.`,
    };
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
      committed: this.committed,
      draft: this.draft,
      layout: this.layout,
      events: this.events,
      selectedTileId: this.selectedTileId,
      selectedGroupId: this.selectedGroupId,
      status: this.status,
    };
    this.root.innerHTML = renderApp(vm);
  }
}

const mount = document.getElementById('app');
if (mount) {
  new QuantumCubesController(mount);
}
