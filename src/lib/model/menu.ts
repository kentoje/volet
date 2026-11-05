import type { Component } from 'svelte';

/** A context menu described as data, so menus are built by plain functions and rendered generically. */
export type MenuItem =
  | {
      kind: 'action';
      label: string;
      onSelect: () => void;
      icon?: Component<{ size?: number; strokeWidth?: number }>;
      destructive?: boolean;
      disabled?: boolean;
    }
  | { kind: 'separator' }
  | { kind: 'submenu'; label: string; items: MenuItem[]; icon?: Component<{ size?: number; strokeWidth?: number }> }
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
