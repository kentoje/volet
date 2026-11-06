import { createContext } from 'svelte';
import type { MountQueue } from '../primitives/mount-queue';

/** The sidebar's one `MountQueue`: rows mounting in a burst (a big folder opening) share its budget. */
export const [getMountQueue, setMountQueue, hasMountQueue] = createContext<MountQueue>();
