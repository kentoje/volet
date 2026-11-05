import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Spaces',
    description: 'Arc-like vertical tab spaces for Chrome',
    permissions: ['sidePanel', 'tabs', 'tabGroups', 'bookmarks', 'storage', 'alarms', 'favicon', 'search'],
    // An action is required so clicking the toolbar icon can open the side panel.
    action: {},
  },
});
