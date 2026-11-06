import { createContext } from 'svelte';
import { countPins, type ImportedSidebar } from '../import/types';

/** An Arc Space the sidebar can still bring in as a Volet. */
export interface ArcSpaceOffer {
  id: string;
  name: string;
  hue?: number;
  pins: number;
}

/**
 * The sidebar's link to Arc: the first-run invitation, and the Spaces of the Arc file read last
 * (remembered by the import page) that haven't been imported yet.
 */
export interface ArcClient {
  /** Show the "Coming from Arc?" card (after install, until dismissed or something is imported). */
  readonly invite: boolean;
  readonly offers: readonly ArcSpaceOffer[];
  openImport(): void;
  dismissInvite(): void;
  /** Bring one Arc Space in as a new Volet. Resolves to the new Volet's id. */
  importSpace(id: string): Promise<string | undefined>;
  /** Forget the Arc file: its Spaces are no longer offered. */
  forget(): void;
}

/** Arc Spaces not imported yet, in Arc's order. Pure. */
export function arcOffers(sidebar: ImportedSidebar | null, imported: readonly string[]): ArcSpaceOffer[] {
  const done = new Set(imported);
  return (sidebar?.spaces ?? []).flatMap((space) =>
    space.id && !done.has(space.id)
      ? [{ id: space.id, name: space.name, hue: space.hue, pins: countPins(space.pinned) }]
      : [],
  );
}

/** Undefined where Arc isn't wired in (the sidebar then shows nothing about it). */
export const [getArcClient, setArcClient] = createContext<ArcClient | undefined>();
