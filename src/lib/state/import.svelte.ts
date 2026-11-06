import { importedArcSpacesItem } from '@/lib/engine/storage';
import { ArcImportError } from '@/lib/import/arc';
import type { ImportedSidebar } from '@/lib/import/types';
import { type ArcFileHandle, loadArcFile, readArcFile } from './arc-file';
import { rememberArcFile } from './arc.svelte';
import { sendCommand } from './chrome/command-client';
import { range, toggled } from './tree';

export interface ImportResult {
  spaces: number;
  pins: number;
  favorites: number;
  spaceIds: string[];
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
  /** Arc's file, if it was chosen before: it can be read again without the file picker. */
  remembered = $state.raw<ArcFileHandle>();
  /** Ids of the Arc Spaces already imported (they start unchecked). */
  imported = $state.raw<readonly string[]>([]);

  async start(): Promise<void> {
    this.remembered = await loadArcFile();
    this.imported = await importedArcSpacesItem.getValue();
  }

  async readFile(file: File, handle?: FileSystemFileHandle): Promise<void> {
    this.error = undefined;
    try {
      const sidebar = await rememberArcFile(file, handle);
      if (sidebar.spaces.length === 0 && sidebar.favorites.length === 0) {
        throw new ArcImportError('This file has no Spaces or favorites to import.');
      }
      if (handle) this.remembered = handle;
      this.sidebar = sidebar;
      this.chosen = range(sidebar.spaces.length, (index) => !this.isImported(index));
      this.step = 'review';
    } catch (error) {
      this.error =
        error instanceof ArcImportError
          ? error.message
          : `Couldn't read this file. Choose Arc's StorableSidebar.json (${(error as Error).message}).`;
    }
  }

  /** Read the remembered file again (Chrome may ask for permission first: call it from a click). */
  async readRemembered(): Promise<void> {
    if (!this.remembered) return;
    const file = await readArcFile(this.remembered, true);
    if (file) await this.readFile(file, this.remembered);
    else this.error = "Couldn't open Arc's file this time. Choose it below.";
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
