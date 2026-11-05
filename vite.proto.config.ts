import { fileURLToPath } from 'node:url';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Runs the sidebar UI as a plain web page on fake data, for fast visual iteration
// without reloading the extension.
export default defineConfig({
  root: fileURLToPath(new URL('./proto', import.meta.url)),
  plugins: [svelte({ preprocess: vitePreprocess() }), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
