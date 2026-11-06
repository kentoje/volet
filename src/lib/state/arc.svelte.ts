import { arcInviteItem, arcSidebarItem, importedArcSpacesItem } from '@/lib/engine/storage';
import { parseArcSidebar } from '@/lib/import/arc';
import type { ImportedSidebar } from '@/lib/import/types';
import { type ArcClient, arcOffers } from '@/lib/model/arc';
import { sendCommand } from './chrome/command-client';

/**
 * Read Arc's sidebar file and remember what's in it, so the import page and the sidebar can offer
 * its Spaces later without the file. (Not the file itself: Chrome won't hand out a lasting handle to
 * anything under ~/Library, where Arc keeps it.) Throws if it isn't Arc's file.
 */
export async function rememberArcFile(file: File): Promise<ImportedSidebar> {
  const sidebar = parseArcSidebar(JSON.parse(await file.text()));
  await arcSidebarItem.setValue(sidebar);
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
  }
}
