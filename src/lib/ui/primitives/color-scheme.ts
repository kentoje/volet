import { MediaQuery } from 'svelte/reactivity';

const prefersDark = new MediaQuery('(prefers-color-scheme: dark)');

/** The scheme a surface renders in (`data-scheme`): the system's, unless one is forced. Reactive. */
export function colorScheme(forced?: 'light' | 'dark'): 'light' | 'dark' {
  return forced ?? (prefersDark.current ? 'dark' : 'light');
}
