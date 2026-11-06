import { arcInviteItem, arcSidebarItem, importedArcSpacesItem } from '@/lib/engine/storage';
import { parseArcSidebar } from '@/lib/import/arc';
import type { ImportedSidebar } from '@/lib/import/types';
import { type ArcClient, arcOffers } from '@/lib/model/arc';
import { forgetArcFile, loadArcFile, readArcFile, saveArcFile } from './arc-file';
import { sendCommand } from './chrome/command-client';

/**
 * Read Arc's sidebar file and remember what's in it (and where it is, when the browser says),
 * so the sidebar can offer its Spaces later. Throws if it isn't Arc's file.
 */
export async function rememberArcFile(file: File, handle?: FileSystemFileHandle): Promise<ImportedSidebar> {
  const sidebar = parseArcSidebar(JSON.parse(await file.text()));
  await arcSidebarItem.setValue(sidebar);
  if (handle) await saveArcFile(handle).catch(() => undefined);
  return sidebar;
}

/** Arc for the side panel: reads what the import page remembered, and stays in sync with it. */
export class ChromeArcClient implements ArcClient {
  invite = $state(false);
  #sidebar = $state.raw<ImportedSidebar | null>(null);
  #imported = $state.raw<string[]>([]);
  readonly offers = $derived(arcOffers(this.#sidebar, this.#imported));

  async start(): Promise<void> {
    const [invite, sidebar, imported] = await Promise.all([
      arcInviteItem.getValue(),
      arcSidebarItem.getValue(),
      importedArcSpacesItem.getValue(),
    ]);
    this.invite = invite;
    this.#sidebar = sidebar;
    this.#imported = imported;
    arcInviteItem.watch((next) => (this.invite = next));
    arcSidebarItem.watch((next) => (this.#sidebar = next));
    importedArcSpacesItem.watch((next) => (this.#imported = next));
    void this.#reread();
  }

  /** Pick up changes made in Arc since: re-read the file if the browser still lets us, without asking. */
  async #reread(): Promise<void> {
    const handle = await loadArcFile();
    const file = handle && (await readArcFile(handle, false));
    if (file) await rememberArcFile(file).catch(() => undefined);
  }

  openImport(): void {
    void sendCommand({ type: 'openImport' });
  }

  dismissInvite(): void {
    this.invite = false;
    void arcInviteItem.setValue(false);
  }

  async importSpace(id: string): Promise<string | undefined> {
    const space = this.#sidebar?.spaces.find((candidate) => candidate.id === id);
    if (!space) return undefined;
    const result = (await sendCommand({ type: 'importSidebar', sidebar: { spaces: [space], favorites: [] } })) as {
      spaceIds: string[];
    };
    return result.spaceIds[0];
  }

  forget(): void {
    this.#sidebar = null;
    void arcSidebarItem.setValue(null);
    void forgetArcFile().catch(() => undefined);
  }
}
