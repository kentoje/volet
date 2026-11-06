import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MountQueue } from './mount-queue';

describe('MountQueue', () => {
  let frames: FrameRequestCallback[] = [];
  const nextFrame = () => {
    const run = frames;
    frames = [];
    for (const callback of run) callback(0);
  };

  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lets everything mount before the first frame (the first render)', () => {
    const queue = new MountQueue(2);
    expect([queue.take(), queue.take(), queue.take()]).toEqual([true, true, true]);
  });

  it('mounts up to its budget at once, the rest on the next frames, in order', () => {
    const queue = new MountQueue(2);
    nextFrame(); // warm
    expect([queue.take(), queue.take(), queue.take()]).toEqual([true, true, false]);
    const order: string[] = [];
    queue.wait(() => order.push('c'));
    queue.wait(() => order.push('d'));
    queue.wait(() => order.push('e'));
    // Someone asking now doesn't jump the line.
    expect(queue.take()).toBe(false);
    nextFrame();
    expect(order).toEqual(['c', 'd']);
    nextFrame();
    expect(order).toEqual(['c', 'd', 'e']);
    nextFrame(); // budget back
    nextFrame();
    expect(queue.take()).toBe(true);
  });

  it('forgets a row that goes away before its turn', () => {
    const queue = new MountQueue(1);
    nextFrame();
    queue.take();
    const ready = vi.fn();
    const giveUp = queue.wait(ready);
    giveUp();
    nextFrame();
    expect(ready).not.toHaveBeenCalled();
  });
});
