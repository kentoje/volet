# Volet

Arc-like vertical tab Spaces for Chrome, as a side panel extension. A *volet* is a window shutter in French, and the word French software uses for a side panel.
A rewrite inspired by [Arcify](https://github.com/nisargkolhe/arcify) (GPL-3.0), built with
[WXT](https://wxt.dev), Svelte 5, TypeScript, Tailwind v4, Bits UI and dnd-kit.

## What it does

- **Spaces.** Each Space has its own pinned and temporary tabs, and tints the whole sidebar in its color.
  Switch with the shutters at the bottom, a two-finger swipe (the color follows your fingers), the palette, or a shortcut.
  Each window shows its own Space. In Chrome's tab strip, every Space is a tab group, and the inactive ones are collapsed.
- **Pinned tabs and folders.** Pins keep their home page: navigate away and the row shows where you are, with a button back.
  On hover, × closes the tab (the pin stays, dimmed) and the pin-off button unpins it in one click (it becomes a
  regular tab below the divider). Folders nest; a collapsed folder still shows its open tabs.
- **Temporary tabs** sit below the divider. "Clear" closes them all. Unused ones are archived after 12 hours (configurable)
  and can be found again in search.
- **Favorites.** The grid at the top, shared by all Spaces. Open favorites are Chrome's own pinned tabs, so anything you pin
  in Chrome becomes a favorite.
- **Drag and drop** everything: reorder tabs, drag across the divider to pin or unpin, into folders, up to the favorites,
  or onto another Space's shutter (hold it there to switch to that Space and drop it at an exact spot). Nothing moves until
  you let go: a line shows where the tab will land, and a folder lights up when it will go inside (hold it over the
  folder's middle; its top and bottom edges place it before or after). Drag the shutters themselves to reorder your Spaces.
- **Select several rows** like in Chrome's tab strip: <kbd>Shift</kbd>+click selects a range, <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+click
  adds or removes one, <kbd>Esc</kbd> clears. Drag them together (they move as a stack), or right-click to put them in a new
  folder (a selected folder nests inside it), move them to another Space, or close them. A click anywhere else clears it.
- **Right-click menus** on every tab, pin, folder, favorite and Space: rename (or double-click a pin or folder, click a
  Space's name), move to another Space, put a tab in a new folder, add a new folder at the top of the Space (from a
  pin, folder or the Space) or inside a folder, Space colors, reorder and delete Spaces, and more.
- **Search palette.** Press <kbd>Alt</kbd>+<kbd>T</kbd> on any page for an Arc-style palette over it: open tabs (all windows),
  pins, favorites, archived tabs, Spaces, actions, a web address, or a web search. In the sidebar: the search button,
  <kbd>⌘K</kbd>/<kbd>Ctrl+K</kbd>, or <kbd>/</kbd>.
- **Import from Arc.** Settings → Import from Arc reads Arc's `StorableSidebar.json` and brings over your Spaces, their
  colors, pinned tabs, folders and favorites. The file never leaves your computer.
- **Recent tab switcher.** Hold <kbd>Alt</kbd> (<kbd>⌥</kbd> on a Mac) and press <kbd>,</kbd> to go back through your
  five most recent tabs across Spaces in this window, one tab further back with each press, then let go to switch;
  <kbd>.</kbd> goes forward again if you went too far. A quick tap of either goes back to the previous tab. Newly
  opened background tabs take priority, so opening a link with Cmd/Ctrl+click makes it the next selection. A centered
  preview highlights the selection, the arrow keys move it and Escape cancels. Record a close shortcut in Settings →
  Keyboard shortcuts to close the highlighted tab without switching to it, or hover a preview and use its close button
  (Chrome reserves Cmd+W). Remove both shortcuts to turn the switcher off.
  Screenshots appear after you visit tabs
  and stay in memory on your device.

Spaces, pins, folders and favorites live in your bookmarks (an "Other bookmarks → Volet" folder), so they sync across
your computers with Chrome sync and survive reinstalling. Space colors and settings sync through Chrome too. Nothing is
sent anywhere else: see the [privacy policy](PRIVACY.md).

### Keyboard shortcuts

| Action | Default |
| --- | --- |
| Show or hide the sidebar | <kbd>Alt</kbd>+<kbd>S</kbd> |
| Search tabs, pins and archived tabs | <kbd>Alt</kbd>+<kbd>T</kbd> |
| Go back through recent tabs | <kbd>Alt</kbd>+<kbd>,</kbd> |
| Go forward through recent tabs | <kbd>Alt</kbd>+<kbd>.</kbd> |
| Close highlighted preview tab | not set, record in Volet settings |
| Next / previous Space | not set |
| Pin or unpin the current tab | not set |

Change native shortcuts in `chrome://extensions/shortcuts` (Settings has a link). Chrome lets an extension suggest at
most four, so the others start unassigned. Record and clear the preview-only close
shortcut in Volet settings, including the modifier you hold while cycling. This device-local shortcut works only while
the preview is open.

### Limits of a Chrome extension

- Chrome's own tab strip stays at the top. Spaces keep it tidy by collapsing other Spaces' groups; Chrome's built-in
  vertical tabs can replace it if you prefer.
- The side panel's width and side are set by Chrome.
- The palette can't appear on Chrome's own pages (`chrome://`, the Web Store); there it opens in the sidebar instead.
- The recent tab switcher cannot overlay Chrome pages or the Web Store: its shortcut switches directly to the previous
  tab there. Holding the modifier to choose needs focus in a website or the Volet panel: with focus in the
  address bar or elsewhere in Chrome's own interface, a press switches straight to the previous tab.
- Arc's Split View, Peek and Little Arc aren't possible.

## Install

From the Chrome Web Store (coming soon), or build it yourself:

```bash
pnpm install
pnpm build
```

Then open `chrome://extensions`, enable Developer mode, click "Load unpacked" and pick `output/chrome-mv3`.

## Development

```bash
pnpm proto      # sidebar UI as a plain web page on fake data (fast visual iteration)
pnpm dev        # dev mode: opens a fresh Chrome profile with the extension, live reload
pnpm dev:own    # same dev server, no browser: load output/chrome-mv3-dev in your own profile
pnpm check      # svelte-check + TypeScript
pnpm check:extension  # builds, checks runtime diagnostics and reloads in isolated Chromium
pnpm test       # unit tests (Vitest)
pnpm test:e2e   # builds, then drives real Chromium with the extension loaded (Playwright)
pnpm zip        # production build zipped for the Chrome Web Store (output/volet-<version>-chrome.zip)
pnpm store:images  # renders the store screenshots and promo tiles into store/images
```

Releasing to the Chrome Web Store: the listing copy, permission justifications and the update checklist are in
[store/listing.md](store/listing.md).

### Developing in your own Chrome profile

1. `pnpm dev:own`
2. In `chrome://extensions` (Developer mode on), "Load unpacked" → `output/chrome-mv3-dev` (once).
3. Keep `pnpm dev:own` running: the side panel updates as you edit; background and palette changes reload the
   extension (or press <kbd>Alt</kbd>+<kbd>R</kbd>). Without the dev server, the dev build's pages stay blank.

Don't enable the dev build and a production build in the same profile at the same time: both would manage your tabs.

Architecture, coding guidelines and the Svelte MCP setup are in [AGENTS.md](AGENTS.md).

### Checking extension errors

Run `pnpm check:extension` before sharing an extension build. It builds production output, opens it in a disposable
Chromium profile, exercises the settings, import, sidebar and tab preview, and reloads the extension twice with website
tabs left open. It checks console warnings/errors, uncaught page errors, and Chrome's own extension runtime and
manifest error records. Findings fail the command and are saved to `test-results/extension-check/report.json`.
The check uses local test pages and pregrants website access in a temporary copy only. Your profile and build stay unchanged.
It checks the exercised flows, rather than guaranteeing that every possible browser interaction is error-free.

To inspect a different built extension without rebuilding, use `node scripts/check-extension.mjs --extension /path/to/build`.

Keyboard shortcut values share the same presentation: manifest defaults are muted and labeled Default; bindings that
differ from the defaults are green and labeled Custom. Unassigned shortcuts stay Not set. Native actions are edited
in the browser shortcut editor; Close highlighted tab is recorded in Volet because it is scoped to the preview.
Reserved browser and OS shortcuts still take precedence over webpage handlers.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE).
