import { createContext } from 'svelte';
import type { SidebarStore } from './types';

export const [getSidebar, setSidebar] = createContext<SidebarStore>();
