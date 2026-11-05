import { describe, expect, it } from 'vitest';
import { RefreshGate } from './refresh-gate';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('RefreshGate', () => {
  it('holds refreshes while a command runs, then applies one fresh value', async () => {
    let version = 0;
    const applied: number[] = [];
    const gate = new RefreshGate(async () => version, (value) => applied.push(value));

    const command = deferred<void>();
    const running = gate.during(() => command.promise);
    await gate.request(); // held: a command is in flight
    expect(applied).toEqual([]);

    version = 1;
    command.resolve();
    await running;
    await gate.request();
    expect(applied.at(-1)).toBe(1);
  });

  it('discards a value loaded while a command started', async () => {
    const load = deferred<number>();
    const applied: number[] = [];
    let calls = 0;
    const gate = new RefreshGate(
      () => (calls++ === 0 ? load.promise : Promise.resolve(2)),
      (value) => applied.push(value),
    );
    const refresh = gate.request();
    const command = gate.during(async () => undefined);
    load.resolve(1); // stale: loaded before the command finished
    await refresh;
    await command;
    await gate.request();
    expect(applied).not.toContain(1);
    expect(applied.at(-1)).toBe(2);
  });
});
