import type { Favorite, LiveTab, Space, TabId } from '../../model/types';

export function seedFavorites(): Favorite[] {
  return [
    { id: 'fav-mail', title: 'Gmail', url: 'https://mail.google.com/mail/u/0/', tabId: 1 },
    { id: 'fav-cal', title: 'Calendar', url: 'https://calendar.google.com/calendar/u/0/r' },
    { id: 'fav-github', title: 'GitHub', url: 'https://github.com/', tabId: 2 },
    { id: 'fav-slack', title: 'Slack', url: 'https://app.slack.com/client' , tabId: 3 },
    { id: 'fav-figma', title: 'Figma', url: 'https://www.figma.com/files/recents-and-sharing' },
    { id: 'fav-claude', title: 'Claude', url: 'https://claude.ai/new' },
    { id: 'fav-youtube', title: 'YouTube', url: 'https://www.youtube.com/' },
    { id: 'fav-spotify', title: 'Spotify', url: 'https://open.spotify.com/', tabId: 4 },
  ];
}

function seedTabs(): LiveTab[] {
  return [
    { id: 1, title: 'Inbox (12)', url: 'https://mail.google.com/mail/u/0/', status: 'complete' },
    { id: 2, title: 'GitHub', url: 'https://github.com/', status: 'complete' },
    { id: 3, title: 'Slack: #frontend', url: 'https://app.slack.com/client', status: 'complete' },
    { id: 4, title: 'Spotify: Daily Mix 2', url: 'https://open.spotify.com/', status: 'complete', audible: true },

    // Work
    { id: 10, title: 'Design system', url: 'https://www.figma.com/design/k3J9/design-system', status: 'complete' },
    { id: 11, title: 'My issues', url: 'https://linear.app/acme/my-issues/assigned', status: 'complete' },
    {
      id: 12,
      title: 'Fix hydration mismatch on settings page by mlefort · Pull Request #482',
      url: 'https://github.com/acme/web/pull/482',
      status: 'complete',
    },
    { id: 20, title: '$state • Svelte Docs', url: 'https://svelte.dev/docs/svelte/$state', status: 'complete' },
    {
      id: 21,
      title: 'Array.prototype.toSorted() - JavaScript | MDN',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted',
      status: 'complete',
    },
    {
      id: 22,
      title: 'Detect horizontal trackpad swipe in JavaScript - Stack Overflow',
      url: 'https://stackoverflow.com/questions/15587713/detect-horizontal-swipe',
      status: 'complete',
    },
    { id: 23, title: 'Sortable | dnd kit', url: 'https://dndkit.com/svelte/primitives/create-sortable', status: 'complete' },
    { id: 24, title: 'Vercel – acme-web deployments', url: 'https://vercel.com/acme/acme-web/deployments', status: 'complete' },

    // Perso
    { id: 30, title: 'Lisbon apartment, Alfama · Airbnb', url: 'https://www.airbnb.com/rooms/48213', status: 'complete' },
    { id: 31, title: 'r/espresso: Best grinder under 300€?', url: 'https://www.reddit.com/r/espresso/', status: 'complete' },

    // Side project
    {
      id: 40,
      title: 'chrome.sidePanel | API | Chrome for Developers',
      url: 'https://developer.chrome.com/docs/extensions/reference/api/sidePanel',
      status: 'complete',
    },
    { id: 41, title: 'Context Menu – Bits UI', url: 'https://bits-ui.com/docs/components/context-menu', status: 'complete' },
  ];
}

export function seedSpaces(): Space[] {
  return [
    {
      id: 'work',
      name: 'Work',
      hue: 268,
      pinned: [
        {
          kind: 'folder',
          id: 'docs',
          title: 'Docs',
          children: [
            { kind: 'pin', id: 'pin-wiki', title: 'Engineering wiki', url: 'https://www.notion.so/acme/engineering' },
            {
              kind: 'pin',
              id: 'pin-ds',
              title: 'Design system',
              url: 'https://www.figma.com/design/k3J9/design-system',
              tabId: 10,
            },
            { kind: 'pin', id: 'pin-rfcs', title: 'RFCs', url: 'https://github.com/acme/rfcs' },
          ],
        },
        { kind: 'pin', id: 'pin-linear', title: 'My issues', url: 'https://linear.app/acme/my-issues/assigned', tabId: 11 },
        { kind: 'pin', id: 'pin-prs', title: 'Pull requests', url: 'https://github.com/pulls', tabId: 12 },
        { kind: 'pin', id: 'pin-sentry', title: 'Sentry', url: 'https://acme.sentry.io/issues/' },
      ],
      tabIds: [20, 21, 22, 23, 24],
    },
    {
      id: 'perso',
      name: 'Perso',
      hue: 152,
      pinned: [
        { kind: 'pin', id: 'pin-lemonde', title: 'Le Monde', url: 'https://www.lemonde.fr/' },
        {
          kind: 'folder',
          id: 'trips',
          title: 'Lisbon trip',
          children: [
            { kind: 'pin', id: 'pin-airbnb', title: 'Airbnb', url: 'https://www.airbnb.com/rooms/48213', tabId: 30 },
            { kind: 'pin', id: 'pin-maps', title: 'Lisbon map', url: 'https://www.google.com/maps/place/Lisbon' },
            { kind: 'pin', id: 'pin-tap', title: 'Flights', url: 'https://www.flytap.com/' },
          ],
        },
        { kind: 'pin', id: 'pin-strava', title: 'Strava', url: 'https://www.strava.com/dashboard' },
      ],
      tabIds: [31],
    },
    {
      id: 'side',
      name: 'Side project',
      hue: 42,
      pinned: [
        { kind: 'pin', id: 'pin-repo', title: 'volet', url: 'https://github.com/' },
        { kind: 'pin', id: 'pin-wxt', title: 'WXT docs', url: 'https://wxt.dev/guide/installation' },
      ],
      tabIds: [40, 41],
    },
  ];
}

export function seedTabMap(): ReadonlyMap<TabId, LiveTab> {
  return new Map(seedTabs().map((tab) => [tab.id, tab]));
}

export function seedOpenFolders(): ReadonlySet<string> {
  return new Set(['docs']);
}
