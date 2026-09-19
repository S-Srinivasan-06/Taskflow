import { afterEach, describe, expect, it, vi } from 'vitest';
import { authApi, request, REQUEST_TIMEOUT_MS, setApiUser, STARTUP_TIMEOUT_MS } from './http';

describe('HTTP request coordination', () => {
  afterEach(() => {
    setApiUser(null);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the initial session request alive long enough to wake Render', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    vi.stubGlobal('fetch', fetchMock);

    const pending = authApi.me();
    const rejection = expect(pending).rejects.toMatchObject({ status: 504 });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);

    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(signal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(STARTUP_TIMEOUT_MS - REQUEST_TIMEOUT_MS);
    await rejection;
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

  it('retries authentication once with a fresh CSRF token after a verification failure', async () => {
    let csrfCalls = 0;
    let registerCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/csrf')) {
        csrfCalls++;
        return new Response(JSON.stringify({ token: `csrf-${csrfCalls}` }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.endsWith('/auth/register')) {
        registerCalls++;
        if (registerCalls === 1) return new Response(JSON.stringify({ message: 'Request verification failed; refresh and try again' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
        expect((init?.headers as Headers).get('X-XSRF-TOKEN')).toBe('csrf-2');
        return new Response(JSON.stringify({ id: 'user-id', username: 'alice' }), {
          status: 201, headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    await authApi.register('alice', 'long-enough-password', 'long-enough-password');

    expect(csrfCalls).toBe(2);
    expect(registerCalls).toBe(2);
  });
});
