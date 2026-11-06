import { ArcImportError, parseArcSidebar } from '@/lib/import/arc';
import type { ImportedSidebar } from '@/lib/import/types';
import { sendCommand } from './chrome/command-client';
import { range, toggled } from './tree';

export interface ImportResult {
  spaces: number;
  pins: number;
  favorites: number;
}

/** The Arc import flow: choose the file, review what's in it, import the chosen Spaces. */
export class ImportState {
  step = $state<'choose' | 'review' | 'importing' | 'done'>('choose');
  error = $state<string>();
  sidebar = $state.raw<ImportedSidebar>();
  /** Indexes of the Spaces to import. */
  chosen = $state.raw<ReadonlySet<number>>(range(0));
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
      this.chosen = range(sidebar.spaces.length);
      this.step = 'review';
    } catch (error) {
      this.error =
        error instanceof ArcImportError
          ? error.message
          : `Couldn't read this file. Choose Arc's StorableSidebar.json (${(error as Error).message}).`;
    }
  }

  toggle(index: number): void {
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
