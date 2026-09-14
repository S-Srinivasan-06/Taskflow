const DB_NAME = 'taskflow-local-cache-v1';
const STORE = 'responses';
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_ENTRIES = 80;

interface CacheRecord {
  key: string;
  owner: string;
  value: unknown;
  bytes: number;
  expiresAt: number;
  touchedAt: number;
}

const apiRoot = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const browserOrigin = typeof location === 'undefined' ? 'http://localhost' : location.origin;
const scope = `${browserOrigin}${apiRoot}`;
let writeQueue: Promise<void> = Promise.resolve();

function consentKey(userId: string) {
  return `taskflow:local-cache:${scope}:${userId}`;
}

function ownerKey(userId: string) {
  return `${scope}|${userId}`;
}

function preferencesKey(userId: string) {
  return `taskflow:preferences:${scope}:${userId}`;
}

function recordKey(userId: string, key: string) {
  return `${ownerKey(userId)}|${key}`;
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE, { keyPath: 'key' });
      store.createIndex('owner', 'owner');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function enqueue(work: () => Promise<void>) {
  writeQueue = writeQueue.then(work, work).catch(() => undefined);
  return writeQueue;
}

export function isLocalCacheEnabled(userId: string) {
  try { return localStorage.getItem(consentKey(userId)) === 'enabled'; }
  catch { return false; }
}

export async function setLocalCacheEnabled(userId: string, enabled: boolean) {
  if (enabled && (typeof window === 'undefined' || !('indexedDB' in window))) return false;
  try {
    if (enabled) localStorage.setItem(consentKey(userId), 'enabled');
    else {
      localStorage.removeItem(consentKey(userId));
      localStorage.removeItem(preferencesKey(userId));
    }
  } catch { return false; }
  if (!enabled) await clearLocalCache(userId);
  return true;
}

export function loadLocalPreferences<T>(userId: string): T | undefined {
  if (!isLocalCacheEnabled(userId)) return undefined;
  try {
    const value = localStorage.getItem(preferencesKey(userId));
    return value ? JSON.parse(value) as T : undefined;
  } catch { return undefined; }
}

export function saveLocalPreferences(userId: string, value: unknown) {
  if (!isLocalCacheEnabled(userId)) return;
  try { localStorage.setItem(preferencesKey(userId), JSON.stringify(value)); } catch { /* storage unavailable */ }
}

export async function getCached<T>(userId: string, key: string): Promise<T | undefined> {
  if (!isLocalCacheEnabled(userId) || !('indexedDB' in window)) return undefined;
  try {
    const db = await database();
    const transaction = db.transaction(STORE, 'readwrite');
    const completed = transactionDone(transaction);
    const store = transaction.objectStore(STORE);
    const record = await new Promise<CacheRecord | undefined>((resolve, reject) => {
      const request = store.get(recordKey(userId, key));
      request.onsuccess = () => {
        const found = request.result as CacheRecord | undefined;
        if (found?.expiresAt && found.expiresAt <= Date.now()) store.delete(found.key);
        else if (found) store.put({ ...found, touchedAt: Date.now() });
        resolve(found);
      };
      request.onerror = () => reject(request.error);
    });
    await completed;
    db.close();
    if (!record) return undefined;
    if (record.expiresAt <= Date.now()) return undefined;
    return record.value as T;
  } catch { return undefined; }
}

export function putCached(userId: string, key: string, value: unknown) {
  if (!isLocalCacheEnabled(userId) || !('indexedDB' in window)) return Promise.resolve();
  return enqueue(async () => {
    if (!isLocalCacheEnabled(userId)) return;
    const serialized = JSON.stringify(value);
    const db = await database();
    const owner = ownerKey(userId);
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put({
      key: recordKey(userId, key), owner, value,
      bytes: new TextEncoder().encode(serialized).byteLength,
      expiresAt: Date.now() + TTL_MS, touchedAt: Date.now(),
    } satisfies CacheRecord);
    await transactionDone(transaction);
    await prune(db, owner);
    db.close();
  });
}

export function deleteCached(userId: string, key: string) {
  return enqueue(async () => {
    if (!('indexedDB' in window)) return;
    const db = await database();
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).delete(recordKey(userId, key));
    await transactionDone(transaction);
    db.close();
  });
}

export function clearLocalCache(userId: string) {
  return enqueue(async () => {
    if (!('indexedDB' in window)) return;
    const db = await database();
    const transaction = db.transaction(STORE, 'readwrite');
    const index = transaction.objectStore(STORE).index('owner');
    const cursor = index.openKeyCursor(IDBKeyRange.only(ownerKey(userId)));
    cursor.onsuccess = () => {
      if (!cursor.result) return;
      transaction.objectStore(STORE).delete(cursor.result.primaryKey);
      cursor.result.continue();
    };
    await transactionDone(transaction);
    db.close();
  });
}

async function prune(db: IDBDatabase, owner: string) {
  const transaction = db.transaction(STORE, 'readwrite');
  const store = transaction.objectStore(STORE);
  const request = store.index('owner').getAll(owner);
  request.onsuccess = () => {
    const now = Date.now();
    const records = (request.result as CacheRecord[]).sort((a, b) => b.touchedAt - a.touchedAt);
    let retainedEntries = 0;
    let retainedBytes = 0;
    for (const record of records) {
      const keep = record.expiresAt > now
        && retainedEntries < MAX_ENTRIES
        && retainedBytes + record.bytes <= MAX_BYTES;
      if (keep) {
        retainedEntries++;
        retainedBytes += record.bytes;
      } else store.delete(record.key);
    }
  };
  await transactionDone(transaction);
}
