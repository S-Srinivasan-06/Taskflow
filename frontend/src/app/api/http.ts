export const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
export interface User { id: string; username: string }
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const REQUEST_TIMEOUT_MS = 15_000;
export const STARTUP_TIMEOUT_MS = 58_000;
const stalePaths = new Set<string>();
export function hasStaleReads() { return stalePaths.size > 0; }
function announce(name: string, detail?: unknown) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function')
    window.dispatchEvent(new CustomEvent(name, { detail }));
}
function freshness(key: string, stale: boolean) {
  if (stale) stalePaths.add(key); else stalePaths.delete(key);
  announce('taskflow:cache-status');
}
export async function invalidateTaskCache(id: string) {
  try { await clearLocalCache(id); }
  catch {
    await setLocalCacheEnabled(id, false).catch(() => undefined);
    announce('taskflow:storage-error');
  }
}
let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;
let csrfController: AbortController | null = null;
let generation = 0;
let user: User | null = null;
const pending = new Set<AbortController>();
export function setApiUser(next: User | null) {
  generation++;
  stalePaths.clear();
  announce('taskflow:cache-status');
  pending.forEach(controller => controller.abort());
  pending.clear();
  csrfController?.abort();
  csrfController = null;
  csrfToken = null;
  csrfPromise = null;
  user = next;
}
export function apiUser() { return user; }
async function csrf(epoch: number) {
  if (csrfToken) return csrfToken;
  if (!csrfPromise) {
    const csrfGeneration = generation;
    const controller = new AbortController();
    csrfController = controller;
    const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), REQUEST_TIMEOUT_MS);
    const active = fetch(API_ROOT + '/auth/csrf', { credentials: 'include', cache: 'no-store', signal: controller.signal })
      .then(async res => {
        if (!res.ok) throw new ApiError(res.status, 'Could not verify request');
        const token = (await res.json()).token as string;
        if (csrfGeneration === generation) csrfToken = token;
        return token;
      });
    const settled = active.finally(() => {
      clearTimeout(timer);
      if (csrfPromise === settled) csrfPromise = null;
      if (csrfController === controller) csrfController = null;
    });
    csrfPromise = settled;
  }
  const token = await csrfPromise;
  if (epoch !== generation) throw new DOMException('Account changed', 'AbortError');
  return token;
}
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const epoch = generation;
  const owner = user?.id;
  const controller = new AbortController();
  const method = init.method || 'GET';
  const timeoutMs = path === '/auth/me' && method === 'GET' && !user
    ? STARTUP_TIMEOUT_MS
    : REQUEST_TIMEOUT_MS;
  const cacheable = method === 'GET' && path.startsWith('/tasks') && !!owner;
  const mutation = method !== 'GET' && path.startsWith('/tasks') && !!owner;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const cacheKey = `${path}|timezone=${zone}`;
  const revision = cacheable ? await cacheRevision(owner!) : undefined;
  pending.add(controller);
  const abort = () => controller.abort();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  init.signal?.addEventListener('abort', abort, { once: true });
  try {
    if (init.signal?.aborted) controller.abort();
    if (mutation) await invalidateTaskCache(owner!);
    const requestCsrf = method === 'GET' ? null : await csrf(epoch);
    if (epoch !== generation) throw new DOMException('Account changed', 'AbortError');
    controller.signal.throwIfAborted();
    const headers = new Headers(init.headers);
    if (init.body) headers.set('Content-Type', 'application/json');
    if (requestCsrf) headers.set('X-XSRF-TOKEN', requestCsrf);
    headers.set('X-Timezone', zone);
    const res = await fetch(API_ROOT + path, { ...init, headers, credentials: 'include', cache: 'no-store', signal: controller.signal });
    if (epoch !== generation) throw new DOMException('Account changed', 'AbortError');
    const responseOwner = res.headers.get('X-Taskflow-User');
    if (path.startsWith('/tasks') && responseOwner && owner !== responseOwner) {
      window.dispatchEvent(new Event('taskflow:session-expired'));
      throw new ApiError(401, 'Account changed; sign in again');
    }
    if (!res.ok) {
      if (res.status === 403) csrfToken = null;
      if (res.status === 401 && path.startsWith('/tasks')) window.dispatchEvent(new Event('taskflow:session-expired'));
      const body = await res.json().catch(() => ({}));
      const fields = body.errors ? Object.values(body.errors).join('. ') : '';
      throw new ApiError(res.status, fields || body.message || 'Request failed');
    }
    if (res.status === 204) {
      if (mutation) announce('taskflow:tasks-mutated', owner);
      return undefined as T;
    }
    const result = await res.json() as T;
    if (epoch !== generation) throw new DOMException('Account changed', 'AbortError');
    if (cacheable) {
      freshness(cacheKey, false);
      if (revision !== undefined) void putCached(owner!, cacheKey, result, revision);
    }
    if (mutation) announce('taskflow:tasks-mutated', owner);
    return result;
  } catch (error) {
    const mayFallback = !init.signal?.aborted && (timedOut || !(error instanceof Error && error.name === 'AbortError'))
      && (!(error instanceof ApiError) || error.status >= 500);
    if (cacheable && mayFallback && epoch === generation) {
      const cached = await getCached<T>(owner!, cacheKey);
      if (cached !== undefined && epoch === generation) { freshness(cacheKey, true); return cached; }
    }
    if (timedOut && epoch === generation && !init.signal?.aborted)
      throw new ApiError(504, method === 'GET' ? 'Server is taking too long to respond. Try again.' : 'Response timed out. Check your tasks before retrying; the change may have reached the server.');
    throw error;
  } finally {
    clearTimeout(timer);
    if (mutation) await invalidateTaskCache(owner!);
    pending.delete(controller);
    init.signal?.removeEventListener('abort', abort);
  }
}
export const authApi = {
  me: (signal?: AbortSignal) => request<User>('/auth/me', { signal }),
  login: (username: string, password: string) => authenticate('/auth/login', { username, password }),
  register: (username: string, password: string, confirmPassword: string) => authenticate('/auth/register', { username, password, confirmPassword }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
};
async function authenticate(path: string, body: object) {
  const submit = () => request<User>(path, { method: 'POST', body: JSON.stringify(body) });
  let result: User;
  try { result = await submit(); }
  catch (error) {
    if (!(error instanceof ApiError) || error.status !== 403) throw error;
    csrfToken = null;
    result = await submit();
  }
  // Authentication may rotate the server-side CSRF context. Never carry a
  // pre-authentication token into the first task mutation.
  csrfToken = null;
  return result;
}
import { cacheRevision, clearLocalCache, getCached, putCached, setLocalCacheEnabled } from '../cache/localCache';
