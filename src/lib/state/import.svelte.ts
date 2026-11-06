import { arcSidebarItem, importedArcSpacesItem } from '@/lib/engine/storage';
import { ArcImportError } from '@/lib/import/arc';
import type { ImportResult, ImportedSidebar } from '@/lib/import/types';
import { rememberArcFile } from './arc.svelte';
import { importSidebar } from './chrome/command-client';
import { range, toggled } from './tree';

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** The Arc import flow: choose the file, review what's in it, import the chosen Spaces. */
export class ImportState {
  step = $state<'choose' | 'review' | 'importing' | 'done'>('choose');
  error = $state<string>();
  sidebar = $state.raw<ImportedSidebar>();
  /** Indexes of the Spaces to import. */
  chosen = $state.raw<ReadonlySet<number>>(range(0));
  includeFavorites = $state(true);
  result = $state.raw<ImportResult>();
  /** What Arc's file held the last time it was chosen: it can be reviewed again without the file. */
  saved = $state.raw<ImportedSidebar | null>(null);
  /** Ids of the Arc Spaces already imported (they start unchecked). */
  imported = $state.raw<readonly string[]>([]);

  async start(): Promise<void> {
    [this.saved, this.imported] = await Promise.all([arcSidebarItem.getValue(), importedArcSpacesItem.getValue()]);
  }

  async readFile(file: File): Promise<void> {
    this.error = undefined;
    try {
      const sidebar = await rememberArcFile(file);
      if (sidebar.spaces.length === 0 && sidebar.favorites.length === 0) {
        throw new ArcImportError('This file has no Spaces or favorites to import.');
      }
      this.saved = sidebar;
      this.review(sidebar);
    } catch (error) {
      this.error =
        error instanceof ArcImportError
          ? error.message
          : `Couldn't read this file. Choose Arc's StorableSidebar.json (${messageOf(error)}).`;
    }
  }

  /** Review a sidebar: the Spaces not imported yet start checked. */
  review(sidebar: ImportedSidebar): void {
    this.error = undefined;
    this.sidebar = sidebar;
    this.chosen = range(sidebar.spaces.length, (index) => !this.isImported(index));
    this.step = 'review';
  }

  isImported(index: number): boolean {
    const id = this.sidebar?.spaces[index]?.id;
    return id !== undefined && this.imported.includes(id);
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
      this.result = await importSidebar(sidebar);
      this.step = 'done';
    } catch (error) {
      this.error = `The import stopped: ${messageOf(error)}`;
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
