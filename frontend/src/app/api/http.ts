export const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
export interface User { id: string; username: string }
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;
let csrfController: AbortController | null = null;
let generation = 0;
let user: User | null = null;
const pending = new Set<AbortController>();
export function setApiUser(next: User | null) {
  generation++;
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
    const active = fetch(API_ROOT + '/auth/csrf', { credentials: 'include', cache: 'no-store', signal: controller.signal })
      .then(async res => {
        if (!res.ok) throw new ApiError(res.status, 'Could not verify request');
        const token = (await res.json()).token as string;
        if (csrfGeneration === generation) csrfToken = token;
        return token;
      });
    const settled = active.finally(() => {
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
  const cacheable = method === 'GET' && path.startsWith('/tasks') && !!owner;
  pending.add(controller);
  const abort = () => controller.abort();
  init.signal?.addEventListener('abort', abort, { once: true });
  try {
    if (init.signal?.aborted) controller.abort();
    const requestCsrf = method === 'GET' ? null : await csrf(epoch);
    if (epoch !== generation) throw new DOMException('Account changed', 'AbortError');
    const headers = new Headers(init.headers);
    if (init.body) headers.set('Content-Type', 'application/json');
    if (requestCsrf) headers.set('X-XSRF-TOKEN', requestCsrf);
    headers.set('X-Timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
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
      if (owner && method !== 'GET') await clearLocalCache(owner);
      return undefined as T;
    }
    const result = await res.json() as T;
    if (cacheable && epoch === generation) void putCached(owner!, path, result);
    if (owner && method !== 'GET') await clearLocalCache(owner);
    return result;
  } catch (error) {
    const mayFallback = !(error instanceof Error && error.name === 'AbortError')
      && (!(error instanceof ApiError) || error.status >= 500);
    if (cacheable && mayFallback && epoch === generation) {
      const cached = await getCached<T>(owner!, path);
      if (cached !== undefined && epoch === generation) return cached;
    }
    throw error;
  } finally {
    pending.delete(controller);
    init.signal?.removeEventListener('abort', abort);
  }
}
export const authApi = {
  me: () => request<User>('/auth/me'),
  login: (username: string, password: string) => authenticate('/auth/login', { username, password }),
  register: (username: string, password: string, confirmPassword: string) => authenticate('/auth/register', { username, password, confirmPassword }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
};
async function authenticate(path: string, body: object) {
  const result = await request<User>(path, { method: 'POST', body: JSON.stringify(body) });
  // Authentication may rotate the server-side CSRF context. Never carry a
  // pre-authentication token into the first task mutation.
  csrfToken = null;
  return result;
}
import { clearLocalCache, getCached, putCached } from '../cache/localCache';
