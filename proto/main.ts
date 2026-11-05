import { mount } from 'svelte';
import { FakeSidebarStore } from '@/lib/fake/fake-store.svelte';
import Sidebar from '@/lib/ui/Sidebar.svelte';
import '@/app.css';

// ?theme=dark or ?theme=light forces a color scheme; otherwise it follows the system.
const theme = new URLSearchParams(location.search).get('theme');
const scheme = theme === 'dark' || theme === 'light' ? theme : undefined;

mount(Sidebar, {
  target: document.getElementById('app')!,
  props: { store: new FakeSidebarStore(), scheme },
});
