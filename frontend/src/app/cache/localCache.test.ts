import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getCached,
  isLocalCacheEnabled,
  loadLocalPreferences,
  putCached,
  saveLocalPreferences,
  setLocalCacheEnabled,
} from './localCache';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });

async function deleteDatabase() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('taskflow-local-cache-v1');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

describe('per-user local cache', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    await deleteDatabase();
  });

  it('does not persist without explicit consent', async () => {
    await putCached('alice', '/tasks', { secret: 'alice' });
    expect(isLocalCacheEnabled('alice')).toBe(false);
    expect(await getCached('alice', '/tasks')).toBeUndefined();
  });

  it('isolates records and preferences by user', async () => {
    await setLocalCacheEnabled('alice', true);
    await setLocalCacheEnabled('bob', true);
    await putCached('alice', '/tasks', { owner: 'alice' });
    saveLocalPreferences('alice', { timezone: 'Asia/Kolkata' });

    expect(await getCached('alice', '/tasks')).toEqual({ owner: 'alice' });
    expect(await getCached('bob', '/tasks')).toBeUndefined();
    expect(loadLocalPreferences('alice')).toEqual({ timezone: 'Asia/Kolkata' });
    expect(loadLocalPreferences('bob')).toBeUndefined();
  });

  it('expires old responses', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    await setLocalCacheEnabled('alice', true);
    await putCached('alice', '/tasks', ['old']);
    now.mockReturnValue(1_000 + 24 * 60 * 60 * 1000 + 1);
    expect(await getCached('alice', '/tasks')).toBeUndefined();
  });

  it('clears records and preferences when consent is disabled', async () => {
    await setLocalCacheEnabled('alice', true);
    await putCached('alice', '/tasks', ['private']);
    saveLocalPreferences('alice', { categories: ['private'] });

    await setLocalCacheEnabled('alice', false);

    expect(isLocalCacheEnabled('alice')).toBe(false);
    expect(await getCached('alice', '/tasks')).toBeUndefined();
    expect(loadLocalPreferences('alice')).toBeUndefined();
  });

  it('cannot recreate data with a queued write after disable', async () => {
    await setLocalCacheEnabled('alice', true);
    const pendingWrite = putCached('alice', '/tasks', ['private']);
    const disabling = setLocalCacheEnabled('alice', false);
    await Promise.all([pendingWrite, disabling]);
    expect(await getCached('alice', '/tasks')).toBeUndefined();
  });

  it('evicts the oldest responses above the per-user entry limit', async () => {
    let tick = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => tick++);
    await setLocalCacheEnabled('alice', true);
    for (let index = 0; index <= 80; index++) {
      await putCached('alice', `/tasks?page=${index}`, [index]);
    }
    expect(await getCached('alice', '/tasks?page=0')).toBeUndefined();
    expect(await getCached('alice', '/tasks?page=80')).toEqual([80]);
  });
});
