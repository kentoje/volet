import { createContext } from 'svelte';
import type { ConfirmState } from './confirm-state.svelte';
import type { RenameState } from './rename-state.svelte';

export const [getRename, setRename] = createContext<RenameState>();
export const [getConfirm, setConfirm] = createContext<ConfirmState>();
