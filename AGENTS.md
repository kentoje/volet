# AGENTS.md

Arc-like vertical tab Spaces for Chrome: a side panel extension built with WXT, Svelte 5, TypeScript and Tailwind v4.

## Commands

```bash
pnpm proto          # sidebar UI as a plain web page on fake data (fast visual iteration)
pnpm dev            # extension dev mode with live reload
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
- **Bookmarks are the source of truth**: the `Spaces` folder holds `Favorites` and one folder per Space; pins are bookmarks. Session-only links (tab to pin, group to Space, active Space per window) live in `chrome.storage.session` and are rebuilt after restarts.
- **Pure logic is kept pure** (`derive.ts`, `snapshot.ts`, `colors.ts`, importers, search ranking) so it can be unit tested without Chrome.

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
- Reconcile must stay idempotent: running it twice changes nothing.

## Tests

- Unit tests (`*.test.ts`, Vitest) next to pure modules.
- End-to-end tests (`tests/e2e/*.spec.ts`, Playwright) load `.output/chrome-mv3` into Chromium, open the panel page in its own window (`sidepanel.html?windowId=<id>`), and assert on Chrome's real state from the service worker.
- New behavior in the engine gets an e2e test; new pure logic gets a unit test.

## Writing style

Never use the em dash character in code, comments, docs, UI copy or commit messages. Use a colon, parentheses, a comma, or separate sentences. UI copy is sentence case and names what the user controls.
