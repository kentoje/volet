import type { ArcClient, ArcSpaceOffer } from '@/lib/model/arc';
import type { FakeSidebarStore } from './fake-store.svelte';

/** Arc for the prototype: a first-run invitation and two Arc Spaces left to import. */
export class FakeArcClient implements ArcClient {
  invite = $state(true);
  offers = $state.raw<readonly ArcSpaceOffer[]>([
    { id: 'arc-reading', name: 'Reading', hue: 42, pins: 4 },
    { id: 'arc-side-project', name: 'Side project', hue: 205, pins: 7 },
  ]);

  #store: FakeSidebarStore;

  constructor(store: FakeSidebarStore) {
    this.#store = store;
  }

  openImport(): void {
    console.info('[proto] The import page would open here.');
  }

  dismissInvite(): void {
    this.invite = false;
  }

  async importSpace(id: string): Promise<string | undefined> {
    const offer = this.offers.find((candidate) => candidate.id === id);
    if (!offer) return undefined;
    this.offers = this.offers.filter((candidate) => candidate.id !== id);
    this.invite = false;
    const spaceId = this.#store.addSpace();
    this.#store.renameSpace(spaceId, offer.name);
    if (offer.hue !== undefined) this.#store.setSpaceHue(spaceId, offer.hue);
    return spaceId;
  }

  forget(): void {
    this.offers = [];
  }
}
