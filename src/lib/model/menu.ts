import type { Component } from 'svelte';

export type MenuIcon = Component<{ size?: number; strokeWidth?: number }>;

/** What an item shows before its label: an icon, or a color dot (a Space's hue). */
interface Leading {
  icon?: MenuIcon;
  hue?: number;
}

/** A context menu described as data, so menus are built by plain functions and rendered generically. */
export type MenuItem =
  | ({ kind: 'action'; label: string; onSelect: () => void; destructive?: boolean; disabled?: boolean } & Leading)
  | { kind: 'separator' }
  | ({ kind: 'submenu'; label: string; items: MenuItem[] } & Leading)
  | { kind: 'swatches'; label: string; hues: number[]; selected?: number; onSelect: (hue: number) => void };

export const separator: MenuItem = { kind: 'separator' };

/** Drop leading, trailing and doubled separators (items are often added conditionally). */
export function tidy(items: (MenuItem | false | undefined)[]): MenuItem[] {
  const kept = items.filter((item): item is MenuItem => Boolean(item));
  return kept.filter(
    (item, index) =>
      item.kind !== 'separator' ||
      (index > 0 && index < kept.length - 1 && kept[index - 1]!.kind !== 'separator'),
  );
}

/** Whether an item shows an icon or a dot before its label. */
export const hasLeading = (item: MenuItem): boolean =>
  (item.kind === 'action' || item.kind === 'submenu') && (item.icon !== undefined || item.hue !== undefined);
