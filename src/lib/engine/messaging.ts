import { browser } from 'wxt/browser';
import type { Engine } from './engine';
import type { CommandResult, RuntimeMessage } from './protocol';

const failure = (error: unknown): CommandResult => ({
  ok: false,
  error: String((error as Error)?.message ?? error),
});

/** Answer side panel messages: run commands, and tidy a window when its panel opens. */
export function listenForMessages(engine: Engine): void {
  browser.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
    const respond = (work: Promise<unknown>) => {
      work.then(
        (value) => sendResponse({ ok: true, value } satisfies CommandResult),
        (error: unknown) => {
          console.warn('message failed', message, error);
          sendResponse(failure(error));
        },
      );
      return true; // keep the channel open for the async response
    };
    switch (message?.type) {
      case 'command':
        return respond(engine.run(message.command));
      case 'hello':
        return respond(engine.reconcile(message.windowId));
      default:
        return undefined;
    }
  });
}
