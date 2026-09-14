import { afterEach, describe, expect, it, vi } from 'vitest';
import { authApi, request, setApiUser } from './http';

describe('HTTP request coordination', () => {
  afterEach(() => {
    setApiUser(null);
    vi.unstubAllGlobals();
  });

  it('shares one CSRF fetch across concurrent mutations', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/csrf')) {
        return new Response(JSON.stringify({ token: 'csrf-token' }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ id: 'user-id', username: 'alice' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([
      request('/auth/login', { method: 'POST', body: '{}' }),
      request('/auth/login', { method: 'POST', body: '{}' }),
    ]);

    expect(fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/auth/csrf'))).toHaveLength(1);
    const mutationCalls = fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/auth/login'));
    expect(mutationCalls).toHaveLength(2);
    mutationCalls.forEach(([, init]) => {
      expect((init?.headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-token');
    });
  });

  it('fetches a fresh CSRF token after authentication', async () => {
    let csrfCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/csrf')) {
        csrfCalls++;
        return new Response(JSON.stringify({ token: `csrf-${csrfCalls}` }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ id: 'user-id', username: 'alice' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await authApi.login('alice', 'password');
    await request('/tasks', { method: 'POST', body: '{}' });

    expect(csrfCalls).toBe(2);
    const taskCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/tasks'));
    expect((taskCall?.[1]?.headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-2');
  });
});
