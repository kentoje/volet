import { tick } from 'svelte';
import { prefersReducedMotion } from 'svelte/motion';

/**
 * Motion for drags (DOM only; the drag state stays pure). Rows are found by their
 * `data-entry` key; the card following the pointer is the drag preview (`data-drag-preview`).
 */

/** How long the selected rows take to fly into the stack. */
const GATHER_MS = 220;
/** How long they take to fly out of it onto the list, and the other rows to make room. */
const LAND_MS = 240;
/** Stacked cards under the preview: how many, and how far apart (matches DragStack). */
const STACK_CARDS = 2;
const STACK_STEP = 4;
const STACK_NARROWING = 0.04;

const EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Where the `index`th carried row sits in the stack, relative to the preview's own card. */
const stackSlot = (index: number) => {
  const card = Math.min(index, STACK_CARDS - 1) + 1;
  return { dy: STACK_STEP * card, scale: 1 - STACK_NARROWING * card };
};

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

/** A lookalike of a row, laid over the panel at `rect`, that nothing can interact with. */
function ghostOf(node: HTMLElement, rect: DOMRect, layer: Element): HTMLElement {
  const ghost = node.cloneNode(true) as HTMLElement;
  for (const element of [ghost, ...ghost.querySelectorAll('[id]')]) element.removeAttribute('id');
  ghost.removeAttribute('data-entry');
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
    // A card, like the stack's.
    transformOrigin: 'left top',
    borderRadius: '10px',
    background: 'var(--menu)',
    boxShadow: 'var(--pill-shadow)',
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

/**
 * The rows move to where they were dropped (or back, when nothing was): the others slide to
 * make room or close the gap, and the dragged rows fly from the preview's cards to their
 * places, widening from the card's width to the row's. `change` moves them in the lists; it
 * runs right away, the motion after. Resolves once they have landed.
 */
export async function land(active: string, carried: string[], change: () => void): Promise<void> {
  const from = floating()?.getBoundingClientRect();
  if (prefersReducedMotion.current || !from) return change();
  const before = measure();
  change();
  await tick();
  slide(before, new Set([active, ...carried]), LAND_MS);
  const current = rows();
  const flights = [active, ...carried].flatMap((key) => {
    const node = current.get(key);
    if (!node) return [];
    const to = node.getBoundingClientRect();
    const slot = key === active ? { dy: 0, scale: 1 } : stackSlot(carried.indexOf(key));
    const width = from.width * slot.scale;
    const left = from.left + (from.width - width) / 2;
    const hidden = Math.max(0, to.width - width);
    return node.animate(
      [
        {
          transform: `translate(${left - to.left}px, ${from.top + slot.dy - to.top}px)`,
          clipPath: `inset(0px ${hidden}px 0px 0px round 10px)`,
          opacity: key === active ? 1 : 0.6,
        },
        { transform: 'none', clipPath: 'inset(0px 0px 0px 0px round 10px)', opacity: 1 },
      ],
      { duration: LAND_MS, easing: EASING },
    );
  });
  await Promise.all(flights.map((flight) => flight.finished.catch(() => undefined)));
}
