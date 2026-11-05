# Spaces (working name)

Arc-like vertical tab Spaces for Chrome, as a side panel extension.
A rewrite inspired by [Arcify](https://github.com/nisargkolhe/arcify) (GPL-3.0), built with
[WXT](https://wxt.dev), Svelte 5, TypeScript, Tailwind v4, Bits UI and dnd-kit.

## What it does

- **Spaces.** Each Space has its own pinned and temporary tabs, and tints the whole sidebar in its color.
  Switch with the dots at the bottom, a two-finger swipe (the color follows your fingers), the palette, or a shortcut.
  Each window shows its own Space. In Chrome's tab strip, every Space is a tab group, and the inactive ones are collapsed.
- **Pinned tabs and folders.** Pins keep their home page: navigate away and the row shows where you are, with a button back.
  On hover, × closes the tab (the pin stays, dimmed) and the pin-off button unpins it in one click (it becomes a
  regular tab below the divider). Folders nest; a collapsed folder still shows the tab you're on.
- **Temporary tabs** sit below the divider. "Clear" closes them all. Unused ones are archived after 12 hours (configurable)
  and can be found again in search.
- **Favorites.** The grid at the top, shared by all Spaces. Open favorites are Chrome's own pinned tabs, so anything you pin
  in Chrome becomes a favorite.
- **Drag and drop** everything: reorder tabs, drag across the divider to pin or unpin, into folders, up to the favorites,
  or onto another Space's dot.
- **Right-click menus** on every tab, pin, folder, favorite and Space: rename (or double-click), move to another Space,
  Space colors, reorder and delete Spaces, and more.
- **Search palette.** Press <kbd>Alt</kbd>+<kbd>T</kbd> on any page for an Arc-style palette over it: open tabs (all windows),
  pins, favorites, archived tabs, Spaces, actions, a web address, or a web search. In the sidebar: the search button,
  <kbd>⌘K</kbd>/<kbd>Ctrl+K</kbd>, or <kbd>/</kbd>.
- **Import from Arc.** Settings → Import from Arc reads Arc's `StorableSidebar.json` and brings over your Spaces, their
  colors, pinned tabs, folders and favorites. The file never leaves your computer.

Everything lives in your bookmarks (an "Other bookmarks → Spaces" folder), so it syncs across your computers with Chrome
sync and survives reinstalling. Space colors and settings sync through Chrome too.

### Keyboard shortcuts

| Action | Default |
| --- | --- |
| Open the sidebar | <kbd>Alt</kbd>+<kbd>S</kbd> |
| Search tabs, pins and archived tabs | <kbd>Alt</kbd>+<kbd>T</kbd> |
| Next / previous Space | not set |
| Pin or unpin the current tab | <kbd>Alt</kbd>+<kbd>P</kbd> |

Change them in `chrome://extensions/shortcuts` (Settings has a link).

### Limits of a Chrome extension

- Chrome's own tab strip stays at the top. Spaces keep it tidy by collapsing other Spaces' groups; Chrome's built-in
  vertical tabs can replace it if you prefer.
- The side panel's width and side are set by Chrome.
- The palette can't appear on Chrome's own pages (`chrome://`, the Web Store); there it opens in the sidebar instead.
- Arc's Split View, Peek and Little Arc aren't possible.

## Install (development build)

```bash
pnpm install
pnpm build
```

Then open `chrome://extensions`, enable Developer mode, click "Load unpacked" and pick `.output/chrome-mv3`.

## Development

```bash
pnpm proto      # sidebar UI as a plain web page on fake data (fast visual iteration)
pnpm dev        # extension dev mode with live reload
pnpm check      # svelte-check + TypeScript
pnpm test       # unit tests (Vitest)
pnpm test:e2e   # builds, then drives real Chromium with the extension loaded (Playwright)
```

Architecture, coding guidelines and the Svelte MCP setup are in [AGENTS.md](AGENTS.md).

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
