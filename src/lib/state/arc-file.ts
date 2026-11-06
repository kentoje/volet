/**
 * Remembers where Arc's sidebar file is, so it can be read again without the file picker.
 * A file handle (File System Access API) can't go in chrome.storage, so it lives in IndexedDB,
 * shared by every extension page (the import page saves it, the side panel reads it).
 */

/** The parts of the File System Access API used here (not in TypeScript's DOM types yet). */
type Permission = 'granted' | 'denied' | 'prompt';
export interface ArcFileHandle extends FileSystemFileHandle {
  queryPermission?(options: { mode: 'read' }): Promise<Permission>;
  requestPermission?(options: { mode: 'read' }): Promise<Permission>;
}

const DB = 'volet';
const STORE = 'files';
const KEY = 'arc-sidebar';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export const saveArcFile = (handle: FileSystemFileHandle) => run('readwrite', (store) => store.put(handle, KEY));

export const forgetArcFile = () => run('readwrite', (store) => store.delete(KEY));

export async function loadArcFile(): Promise<ArcFileHandle | undefined> {
  try {
    return (await run('readonly', (store) => store.get(KEY))) as ArcFileHandle | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Read the remembered file. Chrome asks the user again after a restart: `ask` lets this show
 * that prompt (it needs a click to have just happened); without it, an unread file gives undefined.
 */
export async function readArcFile(handle: ArcFileHandle, ask: boolean): Promise<File | undefined> {
  try {
    let permission = (await handle.queryPermission?.({ mode: 'read' })) ?? 'granted';
    if (permission === 'prompt' && ask) permission = (await handle.requestPermission?.({ mode: 'read' })) ?? 'denied';
    return permission === 'granted' ? await handle.getFile() : undefined;
  } catch {
    return undefined; // moved, deleted, or the prompt was refused
  }
}
