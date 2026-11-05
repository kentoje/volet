import { mount } from 'svelte';
import SettingsPage from '@/lib/ui/settings/SettingsPage.svelte';
import '@/styles/page.css';

mount(SettingsPage, { target: document.getElementById('app')! });
