import { mount } from 'svelte';
import ImportPage from '@/lib/ui/import/ImportPage.svelte';
import '@/styles/page.css';

mount(ImportPage, { target: document.getElementById('app')! });
