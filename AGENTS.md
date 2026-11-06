# AGENTS.md

Volet: Arc-like vertical tab Spaces for Chrome, a side panel extension built with WXT, Svelte 5, TypeScript and Tailwind v4.

## Commands

```bash
pnpm proto          # sidebar UI as a plain web page on fake data (fast visual iteration)
pnpm dev            # extension dev mode: launches a fresh Chrome profile, live reload
pnpm dev:own        # same, without launching Chrome (load .output/chrome-mv3-dev in your own profile)
pnpm build          # production build in .output/chrome-mv3
pnpm check          # svelte-check + TypeScript
pnpm test           # unit tests (Vitest)
pnpm test:e2e       # builds, then drives real Chromium with the extension loaded (Playwright)
```

## Svelte MCP

The Svelte MCP server is configured for this project in `.mcp.json` (remote, `https://mcp.svelte.dev/mcp`).
In Claude Code it is equivalent to `claude mcp add -t http -s project svelte https://mcp.svelte.dev/mcp`.
Approve it when Claude Code asks on first launch in this repo.

Use it whenever you write or change Svelte code:

1. **list-sections**: call it first on any Svelte or SvelteKit question to find the relevant documentation sections.
2. **get-documentation**: fetch every section relevant to the task before writing code that depends on it. Prefer it over memory: Svelte 5 APIs change.
3. **svelte-autofixer**: run it on every `.svelte` and `.svelte.ts` file you create or edit, and keep fixing and re-running until it reports no issues or suggestions. Pass the Svelte version from `package.json`.
4. **playground-link**: only when the user asks for a playground, and never for code that lives in this repo.

## Architecture

Three layers, each with a single job. Dependencies point downward only.

| Layer | Where | Job |
| --- | --- | --- |
| UI: primitives | `src/lib/ui/primitives/` | Presentational components (`TabRow`, `FolderRow`, `FavoriteTile`, `SpaceDot`, `Pager`...). Props in, callbacks and snippets out. Know nothing about the store. |
| UI: containers | `src/lib/ui/sidebar/` | Thin components that read `SidebarStore` (via `getSidebar()`) and wire primitives to its actions, plus UI state modules (`space-swipe`, `space-tint`). |
| Model | `src/lib/model/` | Domain types (`SidebarStore` contract), context, and small pure helpers (`hue`, `url`, `pinned`). |
| State | `src/lib/state/` | `SidebarStore` implementations: `chrome/` (reads Chrome, sends commands, optimistic updates) and `fake/` (prototype data). Pure update helpers in `tree.ts`. |
| Business logic | `src/lib/engine/` | Pure derivation (`derive.ts`, `snapshot.ts`, `schema.ts`, `colors.ts`) and the service worker engine: `engine.ts` (queue), `commands/` (one file per area), `reconcile.ts`, `groups.ts`, `tab-ops.ts`, `session.ts`. The only code that writes to Chrome. |

- **Reads are local, writes are central.** Each side panel derives its state from Chrome's events. Every change is a `Command` (see `engine/commands.ts`) sent to the service worker, which runs commands one at a time through a serial queue and retries calls Chrome rejects while the user drags a tab.
- **Bookmarks are the source of truth**: the `Volet` folder holds `Favorites` and one folder per Space; pins are bookmarks. Session-only links (tab to pin, group to Space, active Space per window) live in `chrome.storage.session` and are rebuilt after restarts.
- **Pin titles follow the page**: when a pin's or favorite's tab finishes loading the bookmark's own URL, the engine
  gives the bookmark the page's title (`engine/titles.ts`), unless the user named it (renamed in Volet, or a custom
  name in Arc). Named titles are kept as signatures of URL and title (`namedTitlesItem`, synced), not bookmark ids.
- **Arc import**: `import/arc.ts` parses Arc's `StorableSidebar.json` (pure). The import page reads it with a plain
  file input (Chrome's File System Access picker refuses anything under `~/Library`, where Arc keeps it, so no lasting
  file handle either) and remembers what's in it (`arcSidebarItem`), to review again without the file; the engine
  records which Arc Spaces came in (`importedArcSpacesItem`). The side panel gets an `ArcClient` (`model/arc.ts`, passed to `Sidebar` like the
  palette client): while Arc Spaces are left, the New Volet button opens a menu offering them, and after install a
  "Coming from Arc?" card (`ArcInvite`, `arcInviteItem`) opens the import until it's dismissed or used.
- **Pure logic is kept pure** (`derive.ts`, `snapshot.ts`, `colors.ts`, importers, search ranking) so it can be unit tested without Chrome.
- **Entry points** (`src/entrypoints/`): `background.ts` (the engine), `sidepanel/` (the sidebar), `palette.ts`
  (unlisted script injected into the current page by the palette shortcut, rendered in a shadow root),
  `options/` (settings) and `import/` (Arc import).
- **Drag and drop** (`ui/sidebar/drag/`): nothing moves while dragging. `DragState.drop` is where the rows would
  land, shown as a line in the gap next to a row (`DropLine`, drawn by `SortableEntry`), a lit-up folder row (its
  middle drops into it) or a lit-up empty list (`DropZone`; the unpinned tabs have no empty hint to light up, so
  they show a line at their top instead, `empty="line"`). Hit testing is by pointer only (`pointerIntersection`),
  and a row's drop target is its row button (`attachTarget`), so a folder's contents don't count as the folder;
  between rows, `drop-geometry.ts` picks the closest row from the DOM (`data-entry`, `data-list`). The slot rules
  (`zoneAt`, `slotAt`, `resolveDrop`) and the drop-to-action mapping (`groupDrop`) are pure (`model/dnd.ts`). On
  drop, the draft shows the result at once, its rows hidden, and `land` (`group-motion.ts`) flies a copy of the
  preview from where it was let go onto the row's new place (measured every frame, as lists around it may still
  move), where the row fades in under it; the other rows slide to make room. The store may already have changed a
  dropped entry (a pin turned into a tab): the draft's rows look entries up through `DragState.find`, which falls
  back to the content as it was when let go (`kept`), so they never render empty mid-flight. dnd-kit shows no
  feedback (`feedback: 'none'`, its DOM-moving sorting is off too, and so is its slide of rows whose index changed,
  `transition: null`, which would move a dropped row under the copy flying onto it): `DragPreview` is a full-size copy of the row
  (rows mark their root `data-row`; the copy sets `data-hovered` to keep the hover look), held where the pointer took
  it and slightly see-through, like Arc, so the drop line or folder under it shows. DragLayer hands its shape to
  dnd-kit each frame (dnd-kit only re-checks collisions when the dragged shape changes, and reports moves before
  updating the pointer). Row buttons are the drag handles; give action buttons and inputs `data-no-drag`. Holding
  a dragged row over a Space dot switches to that Space after a short dwell (`drag-state.svelte.ts`), so it can be
  dropped there.
  The dots are sortable too (`SortableSpaceDot`, type `SPACE_DOT`, reordered by `space-order.svelte.ts`); rows and
  lists refuse them with `accept: notSpaceDot`, so give any new droppable that filter.
- **Folders**: a collapsed folder keeps rendering its list as `folded` (`PinnedList`): rows without an open tab
  slide away and the open ones stay in place (`hasOpenTab` in `model/pinned.ts`). Those slides are local
  transitions on purpose, so rows added or removed for other reasons (drags, optimistic ids) just appear.
- **Volet switcher**: there's no limit on Volets; every tab group in Chrome is one, so a first run starts with the
  user's groups. Their dots (`SpaceSwitcher`) narrow from 28px to 20px to fit between the two buttons, then the row
  scrolls (`primitives/scroll-strip.ts`): no scrollbar, a fade on each edge that hides dots, the wheel scrolls it, and
  the active Space's dot is kept in view. Wheel events the row uses stop there, so they don't also swipe Spaces.
- **Menus are data** (`model/menu.ts`), built by plain functions in `ui/sidebar/menus/` and rendered by the generic
  `primitives/menu/ContextMenu.svelte` (right-click) or `DropdownMenu.svelte` (from a button, like New Volet); a
  `group` item puts items under a small heading in the menu itself. Overlays portal into `[data-overlay-root]` inside `.sidebar` to keep the tint.
  Every menu is placed by `primitives/menu/placement.ts` (`MENU_PLACEMENT`): menus open below the pointer so they can
  slide sideways and flip up to stay inside the panel, and scroll when taller than it. Submenus expand in place under
  their item (`SubMenu.svelte`) instead of flying out: there's no room beside a menu in a side panel, and one laid
  over it would hide its other items.
  A right-click doesn't give the side panel focus (macOS), and nothing can, so menus must work in an unfocused
  panel (`primitives/menu/dismiss.ts`): they close on blur or, without focus, when the pointer leaves the panel,
  and their items also highlight on hover while `<html data-unfocused>` is set (Bits UI highlights through focus
  events, which an unfocused panel never gets). Give new menu item styles the same hover rule. While a menu is open,
  the row it opened on keeps its hover look: `ContextMenu` sets `data-hovered` on its trigger's first element, which
  rows style like hover (give new rows the same rule). Closing a menu sends focus back where it was,
  except when an item just focused a text field (an inline rename): that field keeps it (`keepFieldFocus`).
- **Active row in view**: the active tab's row scrolls its page to show itself when it becomes active or appears
  (a new tab at the end of a long list), gliding (`primitives/reveal-row.ts`, attached by `TabRow`). It scrolls only
  the page: `scrollIntoView` would also move the overflow-hidden strip the pages slide in.
- **Big lists stay smooth**: rows are costly to mount (a sortable, a menu, tooltips), so a folder opening on a hundred
  pins would freeze the panel. Pinned rows mount through the sidebar's `MountQueue` (`primitives/mount-queue.ts`,
  `Deferred`): up to 16 per frame, the rest a frame later each, top to bottom, behind a same-height placeholder (the
  first render has no limit). Menus and tooltips mount their content (portal, floating layer) the first time they
  open, then keep it: keep new ones lazy the same way.
- **Tooltips**: wrap a trigger in `primitives/tooltip/Tooltip.svelte` instead of a native `title` (`IconButton` does it
  for you). They show right away, close as soon as the pointer leaves the trigger, and fade in and out
  (`.tooltip-surface` in `app.css`); one `Tooltip.Provider` sits in `Sidebar.svelte`. Wrap neighboring triggers in a
  `TooltipGroup` (the Space dots, a row's buttons) and they share one tooltip that glides between them; keep those
  triggers touching (no gap, inner icons `pointer-events-none`) or the tooltip closes in between.
- **Selection**: `ui/sidebar/selection/selection.svelte.ts` holds the selected rows of the active Space (Shift and
  Cmd/Ctrl+click, Chrome's tab strip model). Rows ask it first on click (`selection.click`), menus switch to the
  selection's menu through `rowMenu`, and a drag that starts on a selected row carries the whole selection
  (`DragState.group`, landed in order by the pure `groupDrop`). `drag/group-motion.ts` animates it (DOM only, rows
  found by `data-entry`): copies of the rows fly into the preview's stack on grab (the rows stay in place, faded),
  and on drop copies fly out of its cards onto the rows, like the dragged row's; `DragState.hold` keeps the draft
  until they have landed. Page order and placement rules are pure
  (`model/selection.ts`). `SelectionDismiss` clears it on a click outside the selected rows, on panel blur, and on
  an Escape nothing else handled. Mark new menus or dialogs' containers so they stay inside `[data-overlay-root]`.
- **Styles**: `styles/tokens.css` (design tokens on `.sidebar`, `.palette-root`, `.page-root`), `styles/theme.css`
  (Tailwind theme), then one entry stylesheet per surface (`app.css`, `ui/palette/palette.css`, `styles/page.css`).
  Inside the palette's shadow root, avoid Tailwind utilities that rely on `@property` (transforms, shadows, rings).

## Coding guidelines

Prioritize **modularity, reusability, and separation of concerns**.

- **One responsibility per component, kept small and focused.** When a component or module grows, extract helpers, sub-components, or state modules instead of expanding it. Never add "just one more thing" to a file when it deserves its own abstraction.
- **Generic and data-driven.** Components take clear inputs (props) and outputs (callback props or snippets). No hardcoded business rules or tight coupling: presentational components (`TabRow`, `IconButton`, `Favicon`, ...) know nothing about the store; thin container components connect them to `SidebarStore`.
- **UI, state, and business logic stay separate.** UI components never call `browser.*`. State modules never render. Engine code never imports Svelte.
- **Composition over monoliths.** Build features by composing small pieces (snippets, sub-components, helper modules), not by adding branches to existing ones.
- **Readability, maintainability, scalability** come before cleverness. Name things by what they mean to the user (Space, pin, favorite), not by how Chrome implements them.

Svelte specifics:

- Svelte 5 runes only (`$state`, `$derived`, `$props`, `$effect` as a last resort), snippets instead of slots, callback props instead of events.
- Prefer `$derived` over `$effect` for computed values.
- Tailwind utilities for styling; design tokens are CSS variables on `.sidebar` in `src/app.css` (all tinted by `--space-hue`). Avoid component `<style>` blocks unless Tailwind can't express it.
- Accessibility floor: real buttons, labels on icon-only buttons, visible focus, respect `prefers-reduced-motion`.

Engine specifics:

- Every Chrome write goes through the engine queue. Call Chrome tab APIs that can hit the drag lock through `retry()`.
- Read a tab's URL with `tabUrl()`: Chrome leaves `tab.url` empty until the first navigation commits.
- When a command removes a tab and its binding, close the tab first, then unbind: never let a closing tab show up as
  a temporary tab in between.
- Settings and purely visual state (collapsed folders) are written directly from the UI's state modules; everything
  that touches tabs, groups or bookmarks is a command.
- Reconcile must stay idempotent: running it twice changes nothing.

## Tests

- Unit tests (`*.test.ts`, Vitest) next to pure modules.
- End-to-end tests (`tests/e2e/*.spec.ts`, Playwright) load `.output/chrome-mv3` into Chromium, open the panel page in its own window (`sidepanel.html?windowId=<id>`), and assert on Chrome's real state from the service worker.
- New behavior in the engine gets an e2e test; new pure logic gets a unit test.
- `tests/e2e/resilience.spec.ts` covers multiple windows and a real browser restart (same profile, session restored).
- The palette's in-page overlay can't be triggered from Playwright (shortcuts are browser-level gestures); the panel
  palette exercises the same components and worker messages.

## Writing style

Never use the em dash character in code, comments, docs, UI copy or commit messages. Use a colon, parentheses, a comma, or separate sentences. UI copy is sentence case and names what the user controls.

In UI copy, a Space is called a Volet (plural Volets), like the extension itself: "New Volet", "Move to Volet".
Code, comments and docs keep "Space". The bookmarks root folder is named `Volet` (`ROOT_TITLE`), after the
extension, so it's clear what it's for; the engine names it back if it's renamed. Copy about Arc's own data keeps
Arc's word ("Bring your Arc Spaces").
