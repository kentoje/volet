import { RecentTabCycle } from '@/lib/model/recent-tab-cycle';
import type { RecentTabsClient, RecentTabsView } from '@/lib/model/recent-tabs';

/** Reactive presentation state around the independently testable tab cycle. */
export class RecentTabsState {
  view = $state.raw<RecentTabsView | null>(null);
  /** The window's active Volet's hue, which tints the switcher like the side panel (Search's default until known). */
  hue = $state(268);
  readonly cycle: RecentTabCycle;

  constructor(client: RecentTabsClient) {
    this.cycle = new RecentTabCycle({
      client,
      onchange: (view) => { this.view = view; },
      onerror: (error) => console.warn('Recent tab cycle failed', error),
    });
  }
}
