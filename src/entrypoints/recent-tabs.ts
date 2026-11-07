import { browser } from 'wxt/browser';
import { previewCloseShortcutItem } from '@/lib/engine/recent-tabs/preview-close-shortcut-storage';
import { isPanelKey } from '@/lib/model/recent-tab-keys';
import { chromeRecentTabsClient, panelHoldsModifier } from '@/lib/state/chrome/recent-tabs-client';
import { mountRecentTabsOverlay } from '@/lib/ui/recent-tabs/mount-overlay';
import { RecentTabsState } from '@/lib/ui/recent-tabs/recent-tabs-state.svelte';
import { listenRecentTabKeys } from '@/lib/ui/recent-tabs/recent-tabs-keys';

declare global {
  interface Window { __voletRecentTabsDispose?: () => void }
}

/** Preloaded after opt-in so a fast modifier release cannot race script injection. */
export default defineUnlistedScript(() => {
  if (window.__voletRecentTabsDispose) return;
  const state = new RecentTabsState(chromeRecentTabsClient({ onhue: (hue) => { state.hue = hue; } }));
  const keys = listenRecentTabKeys(state.cycle, panelHoldsModifier);
  let removeOverlay: (() => void) | undefined;

  const configureClose = (value: unknown) => keys.configure(typeof value === 'string' ? value : '');
  void previewCloseShortcutItem.getValue().then(configureClose).catch(() => undefined);
  const unwatchClose = previewCloseShortcutItem.watch(configureClose);

  const ensureOverlay = () => {
    removeOverlay ??= mountRecentTabsOverlay(state);
  };

  const message = (value: unknown, _sender: unknown, respond: (response: unknown) => void) => {
    if (typeof value !== 'object' || value === null || !('type' in value)) return;
    if (value.type === 'recent-tabs:step' && 'shortcut' in value && typeof value.shortcut === 'string') {
      const offset = 'offset' in value ? value.offset : 1;
      if (offset !== 1 && offset !== -1) return;
      ensureOverlay();
      keys.step(value.shortcut, offset);
      respond({ ok: true });
    } else if (value.type === 'recent-tabs:panel-key' && 'key' in value && isPanelKey(value.key)) {
      keys.fromPanel(value.key);
      respond({ ok: true });
    } else if (value.type === 'recent-tabs:visible') {
      respond({ visible: state.cycle.active });
    } else if (value.type === 'recent-tabs:disable') {
      dispose();
      respond({ ok: true });
    }
  };
  const dispose = () => {
    keys.dispose();
    unwatchClose();
    browser.runtime.onMessage.removeListener(message);
    removeOverlay?.();
    delete window.__voletRecentTabsDispose;
  };
  browser.runtime.onMessage.addListener(message);
  window.__voletRecentTabsDispose = dispose;
});
