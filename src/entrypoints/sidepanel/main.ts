import { mount } from 'svelte';
import { FakeSidebarStore } from '@/lib/fake/fake-store.svelte';
import Sidebar from '@/lib/ui/Sidebar.svelte';
import '@/app.css';

// Fake data until the Chrome engine exists; the same UI runs in `pnpm proto`.
mount(Sidebar, {
  target: document.getElementById('app')!,
  props: { store: new FakeSidebarStore() },
});
