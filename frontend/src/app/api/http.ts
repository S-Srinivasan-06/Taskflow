export const API_ROOT = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
export interface User { id: string; username: string }
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
let csrfToken: string | null = null;
let generation = 0;
let user: User | null = null;
const pending = new Set<AbortController>();
export function setApiUser(next: User | null) {
  generation++;
  pending.forEach(controller => controller.abort());
  pending.clear();
  csrfToken = null;
  user = next;
}
export function apiUser() { return user; }
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
    if (method !== 'GET' && !csrfToken) {
      const res = await fetch(API_ROOT + '/auth/csrf', { credentials: 'include', cache: 'no-store', signal: controller.signal });
      if (!res.ok) throw new ApiError(res.status, 'Could not verify request');
      csrfToken = (await res.json()).token;
    }
    if (epoch !== generation) throw new DOMException('Account changed', 'AbortError');
    const headers = new Headers(init.headers);
    if (init.body) headers.set('Content-Type', 'application/json');
    if (method !== 'GET') headers.set('X-XSRF-TOKEN', csrfToken!);
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
      if (res.status === 401 && !path.startsWith('/auth/login')) window.dispatchEvent(new Event('taskflow:session-expired'));
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
    const mayFallback = !(error instanceof DOMException && error.name === 'AbortError')
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
  login: (username: string, password: string) => request<User>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (username: string, password: string, confirmPassword: string) => request<User>('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, confirmPassword }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
};
import { clearLocalCache, getCached, putCached } from '../cache/localCache';
