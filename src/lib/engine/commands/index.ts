import type { Command } from '../protocol';
import { archiveHandlers } from './archive';
import { bookmarkHandlers } from './bookmarks';
import { favoriteHandlers } from './favorites';
import { folderHandlers } from './folders';
import { importHandlers } from './import';
import { pageHandlers } from './pages';
import { pinHandlers } from './pins';
import { spaceHandlers } from './spaces';
import { tabHandlers } from './tabs';
import type { Handlers } from './types';

/** Every command type maps to exactly one handler; TypeScript flags any that is missing. */
const handlers: Handlers = {
  ...tabHandlers,
  ...pinHandlers,
  ...bookmarkHandlers,
  ...folderHandlers,
  ...favoriteHandlers,
  ...spaceHandlers,
  ...archiveHandlers,
  ...importHandlers,
  ...pageHandlers,
};

export function execute(command: Command): Promise<unknown> {
  const handler = handlers[command.type] as (command: Command) => Promise<unknown>;
  return handler(command);
}
