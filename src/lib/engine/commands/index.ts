import type { Command } from '../protocol';
import { archiveHandlers } from './archive';
import { bookmarkHandlers } from './bookmarks';
import { favoriteHandlers } from './favorites';
import { pinHandlers } from './pins';
import { spaceHandlers } from './spaces';
import { tabHandlers } from './tabs';
import type { Handlers } from './types';

/** Every command type maps to exactly one handler; TypeScript flags any that is missing. */
const handlers: Handlers = {
  ...tabHandlers,
  ...pinHandlers,
  ...bookmarkHandlers,
  ...favoriteHandlers,
  ...spaceHandlers,
  ...archiveHandlers,
};

export function execute(command: Command): Promise<unknown> {
  const handler = handlers[command.type] as (command: Command) => Promise<unknown>;
  return handler(command);
}
