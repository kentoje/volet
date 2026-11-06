import { tick } from 'svelte';
import { prefersReducedMotion } from 'svelte/motion';
import { cloneRow, rowOf } from './drag-preview';

/**
 * Motion for drags (DOM only; the drag state stays pure). Rows are found by their
 * `data-entry` key; the card following the pointer is the drag preview (`data-drag-preview`).
 */

/** How long the selected rows take to fly into the stack. */
const GATHER_MS = 220;
/** How long the dragged rows take to fly to where they land, and the other rows to make room. */
const LAND_MS = 240;
/** Stacked cards under the preview: how many, and how far apart (matches DragStack). */
const STACK_CARDS = 2;
const STACK_STEP = 4;
const STACK_NARROWING = 0.04;
/** How see-through the stack's cards are (about, see DragStack). */
const STACK_OPACITY = 0.6;

const EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Where the `index`th carried row sits in the stack, relative to the preview's own card. */
const stackSlot = (index: number) => {
  const card = Math.min(index, STACK_CARDS - 1) + 1;
  return { dy: STACK_STEP * card, scale: 1 - STACK_NARROWING * card };
};

/** The box of the `index`th card in the stack under the preview (at `preview`). */
function stackCard(preview: DOMRect, index: number): DOMRect {
  const { dy, scale } = stackSlot(index);
  const width = preview.width * scale;
  return new DOMRect(preview.left + (preview.width - width) / 2, preview.top + dy, width, preview.height);
}

const floating = () => document.querySelector<HTMLElement>('[data-drag-preview]');

/** The rows in the lists, by entry key. */
function rows(): Map<string, HTMLElement> {
  const found = new Map<string, HTMLElement>();
  for (const node of document.querySelectorAll<HTMLElement>('[data-entry]')) {
    found.set(node.dataset.entry!, node);
  }
  return found;
}

function measure(): Map<string, DOMRect> {
  return new Map([...rows()].map(([key, node]) => [key, node.getBoundingClientRect()]));
}

/** Slide the rows that moved from where they were (`before`) to where they are now. */
function slide(before: Map<string, DOMRect>, skip: ReadonlySet<string>, duration: number): void {
  for (const [key, node] of rows()) {
    const was = before.get(key);
    if (!was || skip.has(key)) continue;
    const now = node.getBoundingClientRect();
    const dx = was.left - now.left;
    const dy = was.top - now.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration, easing: EASING });
  }
}

/**
 * A lookalike of a row on a card (`data-drag-card`, like the preview's), laid over the panel at
 * `rect`, that nothing can interact with.
 */
function ghostOf(node: HTMLElement, rect: DOMRect, layer: Element): HTMLElement {
  const copy = cloneRow(node);
  copy.removeAttribute('data-entry');
  const card = document.createElement('div');
  card.dataset.dragCard = '';
  Object.assign(card.style, {
    position: 'absolute',
    inset: '0',
    zIndex: '-1',
    borderRadius: '10px',
    background: 'var(--menu)',
    boxShadow: 'var(--pill-shadow)',
  });
  const ghost = document.createElement('div');
  ghost.append(card, copy);
  ghost.inert = true;
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    zIndex: '40',
    pointerEvents: 'none',
    listStyle: 'none',
    isolation: 'isolate',
    transformOrigin: 'left top',
  });
  layer.append(ghost);
  // The panel may be the containing block of fixed elements (it is a size container).
  const origin = ghost.getBoundingClientRect();
  ghost.style.left = `${rect.left - origin.left}px`;
  ghost.style.top = `${rect.top - origin.top}px`;
  return ghost;
}

/**
 * Copies of the carried rows lift off the list and fly into the stack under the pointer
 * (following it as it moves); the rows themselves stay in place, faded, until the drop.
 * `change` starts the drag; it runs right away, the motion after.
 */
export function gather(carried: string[], change: () => void): void {
  const layer = document.querySelector('[data-overlay-root]');
  change();
  if (prefersReducedMotion.current || !carried.length || !layer) return;
  const current = rows();
  const ghosts = carried.flatMap((key) => {
    const node = current.get(key);
    return node ? [{ ghost: ghostOf(node, node.getBoundingClientRect(), layer), from: node.getBoundingClientRect() }] : [];
  });

  let target = floating()?.getBoundingClientRect();
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / GATHER_MS);
    const p = easeOut(t);
    // Keep the last known spot if the drag already ended.
    target = floating()?.getBoundingClientRect() ?? target;
    ghosts.forEach(({ ghost, from }, index) => {
      // Onto its card in the stack: as wide as the preview, narrowed around its middle.
      const slot = stackSlot(index);
      const width = target ? target.width * slot.scale : from.width;
      const dx = target ? target.left + (target.width - width) / 2 - from.left : 0;
      const dy = target ? target.top + slot.dy - from.top : 0;
      ghost.style.transform = `translate(${dx * p}px, ${dy * p}px) scaleX(${1 + (width / from.width - 1) * p})`;
      // Hand over to the stack's own cards as they fade in (see DragStack).
      ghost.style.opacity = String(t < 0.6 ? 1 : (1 - t) / 0.4);
    });
    if (t < 1) requestAnimationFrame(step);
    else for (const { ghost } of ghosts) ghost.remove();
  };
  requestAnimationFrame(step);
}

/** Something flying to an entry's row on drop: it starts at `from`, `opacity` see-through. */
interface Flight {
  key: string;
  ghost: HTMLElement;
  from: DOMRect;
  opacity: number;
}

/**
 * The preview leaves with the drag: a copy of it, without the stack behind it (the carried rows
 * fly from there on their own), takes off in its place.
 */
function takeOff(preview: HTMLElement, key: string, layer: Element): Flight {
  const ghost = preview.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('data-drag-preview');
  for (const element of ghost.querySelectorAll('[data-drag-stack]')) element.remove();
  layer.append(ghost);
  ghost.showPopover();
  return { key, ghost, from: preview.getBoundingClientRect(), opacity: Number(getComputedStyle(preview).opacity) };
}

/**
 * Fly onto the row, shedding the card, then hand over: the row, hidden until then, shows up under
 * the copy as the copy fades away. With no row to land on, just fade away.
 */
async function fly({ ghost, from, opacity }: Flight, row: HTMLElement | undefined): Promise<void> {
  const animations = row ? [follow(ghost, from, row), ...handOver(ghost, opacity, row)] : fadeAway(ghost, opacity);
  await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
  ghost.remove();
}

/**
 * Move the copy from `from` onto the row, taking its size. The row is measured every frame: it
 * may still be moving (its list sliding, a folder or hint above it opening or closing). The
 * returned animation animates nothing: it is the clock, so the browser does the easing.
 */
function follow(ghost: HTMLElement, from: DOMRect, row: HTMLElement): Animation {
  const clock = new Animation(new KeyframeEffect(null, null, { duration: LAND_MS, easing: EASING }));
  const step = () => {
    const p = clock.playState === 'finished' ? 1 : (clock.effect?.getComputedTiming().progress ?? 0);
    const to = row.getBoundingClientRect();
    ghost.style.transform = `translate(${(to.left - from.left) * p}px, ${(to.top - from.top) * p}px)`;
    ghost.style.width = `${from.width + (to.width - from.width) * p}px`;
    ghost.style.height = `${from.height + (to.height - from.height) * p}px`;
    if (p < 1) requestAnimationFrame(step);
  };
  clock.play();
  step();
  return clock;
}

function handOver(ghost: HTMLElement, opacity: number, row: HTMLElement): Animation[] {
  const timing = { duration: LAND_MS, fill: 'forwards' } as const;
  // Turns solid on the way, then fades out over the row once there.
  const fade = ghost.animate(
    [{ opacity }, { opacity: 1, offset: 0.4 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }],
    timing,
  );
  const card = ghost.querySelector('[data-drag-card]');
  const shed = card?.animate([{ opacity: 1 }, { opacity: 0 }], { ...timing, easing: EASING });
  // Hidden until the copy has (nearly) arrived, then shows up under it.
  const reveal = row.animate(
    [{ opacity: 0 }, { opacity: 0, offset: 0.6 }, { opacity: 1, offset: 0.85 }, { opacity: 1 }],
    { duration: LAND_MS },
  );
  return [fade, reveal, ...(shed ? [shed] : [])];
}

function fadeAway(ghost: HTMLElement, opacity: number): Animation[] {
  return [ghost.animate([{ opacity }, { opacity: 0 }], { duration: LAND_MS / 2, fill: 'forwards' })];
}

/**
 * Let go: the rows show up where they land right away, hidden, and the dragged row flies there
 * from where the pointer left it (the rows it carries, from their cards in the stack), then hands
 * over to its row. The other rows slide to make room or close the gap. Dropped nowhere, the rows
 * fly back. `change` shows the result; it runs right away, the motion after. Resolves once they
 * have landed.
 */
export async function land(active: string, carried: string[], change: () => void): Promise<void> {
  const preview = floating();
  const layer = document.querySelector('[data-overlay-root]');
  if (prefersReducedMotion.current || !preview || !layer) return change();
  const at = preview.getBoundingClientRect();
  const flights = [
    takeOff(preview, active, layer),
    ...carried.flatMap((key, index): Flight[] => {
      const row = rowOf(key);
      const from = stackCard(at, index);
      return row ? [{ key, ghost: ghostOf(row, from, layer), from, opacity: STACK_OPACITY }] : [];
    }),
  ];
  const before = measure();
  change();
  await tick();
  slide(before, new Set([active, ...carried]), LAND_MS);
  await Promise.all(flights.map((flight) => fly(flight, rowOf(flight.key))));
}
