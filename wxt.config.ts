import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  // A fixed port: the dev build loaded in Chrome hard-codes it, so it must not change between runs.
  dev: { server: { port: 3311, strictPort: true } },
  // `pnpm dev` opens a fresh Chrome profile with the extension loaded.
  // `pnpm dev:own` skips that: load .output/chrome-mv3-dev once in your own profile instead.
  webExt: { disabled: process.env.OWN_PROFILE === '1' },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Spaces',
    description: 'Arc-like vertical tab spaces for Chrome',
    // activeTab + scripting: the palette shortcut may show the palette on the current page only.
    permissions: [
      'sidePanel',
      'tabs',
      'tabGroups',
      'bookmarks',
      'storage',
      'alarms',
      'favicon',
      'search',
      'activeTab',
      'scripting',
    ],
    // The in-page palette shows favicons from Chrome's cache, served from the extension's origin.
    web_accessible_resources: [{ resources: ['_favicon/*'], matches: ['<all_urls>'] }],
    // An action is required so clicking the toolbar icon can open the side panel.
    action: { default_title: 'Open Spaces' },
    commands: {
      _execute_action: { suggested_key: { default: 'Alt+S' }, description: 'Open the sidebar' },
      'open-palette': { suggested_key: { default: 'Alt+T' }, description: 'Search tabs, pins and archived tabs' },
      'next-space': { description: 'Switch to the next Space' },
      'previous-space': { description: 'Switch to the previous Space' },
      'toggle-pin': { suggested_key: { default: 'Alt+P' }, description: 'Pin or unpin the current tab' },
    },
  },
});
