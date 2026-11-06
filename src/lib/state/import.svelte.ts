import { browser } from 'wxt/browser';
import { rootItem } from '@/lib/engine/storage';
import { ArcImportError, parseArcSidebar } from '@/lib/import/arc';
import type { ImportedSidebar } from '@/lib/import/types';
import { MAX_SPACES, roomForSpaces } from '@/lib/model/spaces';
import { sendCommand } from './chrome/command-client';
import { range, toggled } from './tree';

export interface ImportResult {
  spaces: number;
  pins: number;
  favorites: number;
  /** Chosen Spaces left out because there was no room for them. */
  skipped: number;
}

/** Spaces already in the sidebar: the root folder's subfolders, except Favorites. */
async function existingSpaceCount(): Promise<number> {
  const ids = await rootItem.getValue();
  if (!ids) return 0;
  const children = await browser.bookmarks.getChildren(ids.rootId).catch(() => []);
  return children.filter((node) => !node.url && node.id !== ids.favoritesId).length;
}

/** The Arc import flow: choose the file, review what's in it, import the chosen Spaces. */
export class ImportState {
  step = $state<'choose' | 'review' | 'importing' | 'done'>('choose');
  error = $state<string>();
  sidebar = $state.raw<ImportedSidebar>();
  /** Indexes of the Spaces to import. */
  chosen = $state.raw<ReadonlySet<number>>(range(0));
  /** How many more Spaces fit next to the existing ones, read when a file is chosen. */
  room = $state(MAX_SPACES);
  includeFavorites = $state(true);
  result = $state.raw<ImportResult>();

  async readFile(file: File): Promise<void> {
    this.error = undefined;
    try {
      const sidebar = parseArcSidebar(JSON.parse(await file.text()));
      if (sidebar.spaces.length === 0 && sidebar.favorites.length === 0) {
        throw new ArcImportError('This file has no Spaces or favorites to import.');
      }
      this.sidebar = sidebar;
      this.room = roomForSpaces(await existingSpaceCount());
      this.chosen = range(Math.min(sidebar.spaces.length, this.room));
      this.step = 'review';
    } catch (error) {
      this.error =
        error instanceof ArcImportError
          ? error.message
          : `Couldn't read this file. Choose Arc's StorableSidebar.json (${(error as Error).message}).`;
    }
  }

  /** True when no more Spaces can be chosen: the unchosen ones are off. */
  get full(): boolean {
    return this.chosen.size >= this.room;
  }

  toggle(index: number): void {
    if (!this.chosen.has(index) && this.full) return;
    this.chosen = toggled(this.chosen, index);
  }

  async run(): Promise<void> {
    if (!this.sidebar) return;
    this.step = 'importing';
    const sidebar: ImportedSidebar = {
      spaces: this.sidebar.spaces.filter((_, index) => this.chosen.has(index)),
      favorites: this.includeFavorites ? this.sidebar.favorites : [],
    };
    try {
      this.result = (await sendCommand({ type: 'importSidebar', sidebar })) as ImportResult;
      this.step = 'done';
    } catch (error) {
      this.error = `The import stopped: ${(error as Error).message}`;
      this.step = 'review';
    }
  }

  restart(): void {
    this.step = 'choose';
    this.sidebar = undefined;
    this.result = undefined;
    this.error = undefined;
  }
}
