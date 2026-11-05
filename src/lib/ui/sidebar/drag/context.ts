import { PointerActivationConstraints } from '@dnd-kit/dom';
import { PointerSensor } from '@dnd-kit/svelte';
import { createContext } from 'svelte';
import type { DragState } from './drag-state.svelte';

export const [getDrag, setDrag] = createContext<DragState>();

/** What each draggable and drop target carries, so drag events can be translated. */
export type DragData =
  /** `axis`: rows stack vertically; favorites tiles sit side by side. */
  | { kind: 'entry'; entry: import('@/lib/model/dnd').Entry; axis: 'x' | 'y' }
  | { kind: 'list'; list: import('@/lib/model/dnd').ListId }
  | { kind: 'space'; spaceId: string };

/** Collision priority: deeper (more nested) targets win; Space dots beat everything. */
export const priority = {
  list: (depth: number) => 1 + depth * 2,
  entry: (depth: number) => 2 + depth * 2,
  space: 100,
};

/**
 * Drags start anywhere on a row, except on its own action buttons and text fields.
 * (dnd-kit's default refuses to start on any button, and every row is a button.)
 * Given to the provider and to each sortable, since entities otherwise use their own defaults.
 * Pointer only: a keyboard sensor would capture Enter and Space on the row buttons, which
 * must keep activating tabs. Keyboard users move things through the context menus instead.
 */
export const sensors = [
  PointerSensor.configure({
    // A drag starts after 5px of movement (a long press on touch), so a plain click stays a click.
    // (dnd-kit's default for handles starts on pointerdown and swallows the click.)
    activationConstraints: (event) =>
      event.pointerType === 'touch'
        ? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 5 })]
        : [new PointerActivationConstraints.Distance({ value: 5 })],
    preventActivation: (event) =>
      event.target instanceof Element && event.target.closest('[data-no-drag], input, textarea') !== null,
  }),
];
