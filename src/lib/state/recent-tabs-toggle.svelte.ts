import { recentTabsOnItem } from '@/lib/engine/recent-tabs/switcher-preference';

/** The switcher toggle saves its preference without changing shortcuts or website permissions. */
export class RecentTabsToggle {
  enabled = $state(true);
  busy = $state(false);
  error = $state('');

  watch(): () => void {
    const update = (value: boolean) => { this.enabled = value; };
    void recentTabsOnItem.getValue().then(update).catch(() => { this.error = 'Could not load tab switching preference.'; });
    return recentTabsOnItem.watch(update);
  }

  async toggle(): Promise<void> {
    this.busy = true;
    this.error = '';
    try {
      await recentTabsOnItem.setValue(!this.enabled);
      this.enabled = await recentTabsOnItem.getValue();
    } catch { this.error = 'Could not change tab switching. Try again.'; }
    finally { this.busy = false; }
  }
}
