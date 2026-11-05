# Spaces (working name)

Arc-like vertical tab spaces for Chrome, built as a side panel extension.
A rewrite inspired by [Arcify](https://github.com/nisargkolhe/arcify) (GPL-3.0).

Stack: [WXT](https://wxt.dev), Svelte 5, TypeScript, Tailwind v4, Bits UI, @dnd-kit/svelte.

## Development

```bash
pnpm install
pnpm proto   # sidebar UI as a plain web page on fake data (fast visual iteration)
pnpm dev     # extension dev mode, opens Chrome with the extension loaded
pnpm build   # production build in .output/chrome-mv3
pnpm check   # type-check
```

To load a build manually: `chrome://extensions`, enable Developer mode, "Load unpacked", pick `.output/chrome-mv3`.

## Architecture

- **Side panel** (`src/entrypoints/sidepanel`): the main tab UI. Each panel builds its own reactive store from Chrome events.
- **Service worker** (`src/entrypoints/background.ts`): runs all writes to Chrome (tabs, groups, bookmarks) through one serialized command queue.
- **Storage**: bookmarks are the source of truth (Spaces are folders, pins are bookmarks); small extra data in `chrome.storage.sync`.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
