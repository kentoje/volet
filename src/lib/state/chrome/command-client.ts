import { browser } from 'wxt/browser';
import type { Command, CommandResult, RuntimeMessage } from '@/lib/engine/protocol';
import type { ImportResult, ImportedSidebar } from '@/lib/import/types';

/** Send a message to the service worker; resolves with the answer's value, throws on failure. */
export async function send(message: RuntimeMessage): Promise<unknown> {
  const result = (await browser.runtime.sendMessage(message)) as CommandResult | undefined;
  if (!result?.ok) throw new Error(result?.error ?? 'No response from the background worker');
  return result.value;
}

/** Ask the service worker to run a command; resolves with its result. */
export function sendCommand(command: Command): Promise<unknown> {
  return send({ type: 'command', command });
}

/** Import Spaces and favorites (see the engine's `importSidebar`). */
export async function importSidebar(sidebar: ImportedSidebar): Promise<ImportResult> {
  return (await sendCommand({ type: 'importSidebar', sidebar })) as ImportResult;
}

/** Tell the service worker a panel opened, so it can tidy that window. */
export function sayHello(windowId: number): Promise<unknown> {
  return send({ type: 'hello', windowId });
}
