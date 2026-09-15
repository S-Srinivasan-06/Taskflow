const DB_NAME = 'taskflow-local-cache-v1';
const STORE = 'responses';
const EPOCHS = 'epochs';
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_ENTRIES = 80;
interface CacheRecord { key: string; owner: string; value: unknown; bytes: number; expiresAt: number; touchedAt: number }
const apiRoot = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const scope = `${typeof location === 'undefined' ? 'http://localhost' : location.origin}${apiRoot}`;
let writeQueue: Promise<void> = Promise.resolve();
const consentKey = (id: string) => `taskflow:local-cache:${scope}:${id}`;
const ownerKey = (id: string) => `${scope}|${id}`;
const preferencesKey = (id: string) => `taskflow:preferences:${scope}:${id}`;
const recordKey = (id: string, key: string) => `${ownerKey(id)}|${key}`;
const available = () => typeof indexedDB !== 'undefined';

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    let blocked = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE)
        ? request.transaction!.objectStore(STORE) : db.createObjectStore(STORE, { keyPath: 'key' });
      if (!store.indexNames.contains('owner')) store.createIndex('owner', 'owner');
      if (!store.indexNames.contains('expiresAt')) store.createIndex('expiresAt', 'expiresAt');
      if (!db.objectStoreNames.contains(EPOCHS)) db.createObjectStore(EPOCHS);
    };
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => { blocked = true; reject(new Error('Close other Taskflow tabs to update browser storage')); };
  });
}
function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Browser storage transaction failed'));
  });
}
function enqueue(work: () => Promise<void>) {
  const operation = writeQueue.then(work, work);
  writeQueue = operation.catch(() => undefined);
  return operation;
}
async function useDatabase<T>(work: (db: IDBDatabase) => Promise<T>) {
  const db = await database();
  try { return await work(db); } finally { db.close(); }
}
export function isLocalCacheEnabled(id: string) {
  try { return localStorage.getItem(consentKey(id)) === 'enabled'; } catch { return false; }
}
export async function setLocalCacheEnabled(id: string, enabled: boolean) {
  if (enabled && !available()) return false;
  try {
    if (enabled) {
      await maintainLocalCache();
      localStorage.setItem(consentKey(id), 'enabled');
    } else {
      localStorage.removeItem(consentKey(id));
      localStorage.removeItem(preferencesKey(id));
    }
  } catch { return false; }
  if (!enabled) await clearLocalCache(id);
  return true;
}
export function loadLocalPreferences<T>(id: string, validate?: (value: unknown) => value is T): T | undefined {
  if (!isLocalCacheEnabled(id)) return undefined;
  try {
    const raw = localStorage.getItem(preferencesKey(id));
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    if (validate && !validate(value)) { localStorage.removeItem(preferencesKey(id)); return undefined; }
    return value as T;
  } catch { return undefined; }
}
export function saveLocalPreferences(id: string, value: unknown) {
  if (!isLocalCacheEnabled(id)) return;
  try { localStorage.setItem(preferencesKey(id), JSON.stringify(value)); } catch { /* optional storage */ }
}
// Persisted epochs fence late responses across tabs, not just within this module.
export async function cacheRevision(id: string): Promise<number | undefined> {
  if (!isLocalCacheEnabled(id) || !available()) return undefined;
  try {
    return await useDatabase(async db => {
      const tx = db.transaction(EPOCHS, 'readonly');
      const request = tx.objectStore(EPOCHS).get(ownerKey(id));
      await transactionDone(tx);
      return (request.result as number | undefined) ?? 0;
    });
  } catch { return undefined; }
}
export async function getCached<T>(id: string, key: string): Promise<T | undefined> {
  if (!isLocalCacheEnabled(id) || !available()) return undefined;
  try {
    return await useDatabase(async db => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const request = store.get(recordKey(id, key));
      let record: CacheRecord | undefined;
      request.onsuccess = () => {
        record = request.result;
        if (record && record.expiresAt <= Date.now()) { store.delete(record.key); record = undefined; }
        else if (record) store.put({ ...record, touchedAt: Date.now() });
      };
      await transactionDone(tx);
      return isLocalCacheEnabled(id) ? record?.value as T | undefined : undefined;
    });
  } catch { return undefined; }
}
export async function putCached(id: string, key: string, value: unknown, revision?: number) {
  if (!isLocalCacheEnabled(id) || !available()) return;
  const expected = revision ?? await cacheRevision(id);
  if (expected === undefined) return;
  return enqueue(async () => {
    if (!isLocalCacheEnabled(id)) return;
    const bytes = new TextEncoder().encode(JSON.stringify(value)).byteLength;
    if (bytes > MAX_BYTES) return;
    await useDatabase(async db => {
      const tx = db.transaction([STORE, EPOCHS], 'readwrite');
      const read = tx.objectStore(EPOCHS).get(ownerKey(id));
      read.onsuccess = () => {
        if ((read.result ?? 0) !== expected || !isLocalCacheEnabled(id)) return;
        tx.objectStore(STORE).put({ key: recordKey(id, key), owner: ownerKey(id), value, bytes,
          expiresAt: Date.now() + TTL_MS, touchedAt: Date.now() } satisfies CacheRecord);
      };
      await transactionDone(tx);
      await prune(db, ownerKey(id));
    });
  }).catch(() => undefined);
}
export function deleteCached(id: string, key: string) {
  return enqueue(async () => {
    if (!available()) return;
    await useDatabase(async db => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(recordKey(id, key));
      await transactionDone(tx);
    });
  });
}
export function clearLocalCache(id: string) {
  return enqueue(async () => {
    if (!available()) return;
    await useDatabase(async db => {
      const tx = db.transaction([STORE, EPOCHS], 'readwrite');
      const epochs = tx.objectStore(EPOCHS);
      const revision = epochs.get(ownerKey(id));
      revision.onsuccess = () => epochs.put((revision.result ?? 0) + 1, ownerKey(id));
      const cursor = tx.objectStore(STORE).index('owner').openKeyCursor(IDBKeyRange.only(ownerKey(id)));
      cursor.onsuccess = () => {
        if (!cursor.result) return;
        tx.objectStore(STORE).delete(cursor.result.primaryKey);
        cursor.result.continue();
      };
      await transactionDone(tx);
    });
  });
}
export async function maintainLocalCache() {
  if (!available()) return;
  await useDatabase(async db => {
    const tx = db.transaction(STORE, 'readwrite');
    const cursor = tx.objectStore(STORE).index('expiresAt').openCursor(IDBKeyRange.upperBound(Date.now()));
    cursor.onsuccess = () => { if (cursor.result) { cursor.result.delete(); cursor.result.continue(); } };
    await transactionDone(tx);
  });
}
async function prune(db: IDBDatabase, owner: string) {
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const request = store.index('owner').getAll(owner);
  request.onsuccess = () => {
    const records = (request.result as CacheRecord[]).sort((a, b) => b.touchedAt - a.touchedAt);
    let entries = 0, bytes = 0;
    for (const record of records) {
      if (record.expiresAt > Date.now() && entries < MAX_ENTRIES && bytes + record.bytes <= MAX_BYTES) {
        entries++; bytes += record.bytes;
      } else store.delete(record.key);
    }
  };
  await transactionDone(tx);
}
