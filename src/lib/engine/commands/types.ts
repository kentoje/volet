import type { Command } from '../protocol';

export type CommandOf<T extends Command['type']> = Extract<Command, { type: T }>;

/** One handler per command type. */
export type Handlers = { [K in Command['type']]: (command: CommandOf<K>) => Promise<unknown> };
