import { mount } from 'svelte';
import { ChromeSidebarStore } from '@/lib/state/chrome/chrome-store.svelte';
import Sidebar from '@/lib/ui/sidebar/Sidebar.svelte';
import '@/app.css';

async function main() {
  // `?windowId=` lets tests (or a detached panel) drive another window.
  const requested = Number(new URLSearchParams(location.search).get('windowId'));
  const windowId = requested || (await browser.windows.getCurrent()).id!;
  const store = new ChromeSidebarStore(windowId);
  await store.start();
  mount(Sidebar, { target: document.getElementById('app')!, props: { store } });
}

void main();
