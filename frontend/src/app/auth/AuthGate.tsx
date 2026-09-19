import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authApi, setApiUser, apiUser, User, ApiError, API_ROOT, invalidateTaskCache } from '../api/http';
import { clearLocalCache, maintainLocalCache } from '../cache/localCache';
import { lazy, Suspense } from 'react';
import { StartupScreen } from '../components/StartupScreen';
import { Loader3D } from '../components/Loader3D';
const App = lazy(() => import('../App'));

export default function AuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const authChannel = useRef<BroadcastChannel | null>(null);
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: {
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
    staleTime: 30_000, gcTime: 300_000,
  } } }));
  const [loggingIn, setLoggingIn] = useState(false);
  const loginTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (loginTimerRef.current) clearTimeout(loginTimerRef.current);
    };
  }, []);

  function reset() {
    const previous = apiUser();
    setApiUser(null);
    client.clear();
    setUser(null);
    if (previous) void clearLocalCache(previous.id).catch(() => setNotice('Could not remove saved browser data. Clear site storage in browser settings.'));
  }
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true); setUnavailable(false);
    const startTime = Date.now();
    const waitRemaining = async () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 5000 - elapsed);
      if (remaining > 0 && alive) {
        await new Promise<void>(resolve => {
          retryTimer = setTimeout(resolve, remaining);
          controller.signal.addEventListener('abort', () => { clearTimeout(retryTimer); resolve(); }, { once: true });
        });
      }
    };
    const restore = async () => {
      for (let attempt = 0; attempt < 5 && alive; attempt++) {
        try {
          const next = await authApi.me(controller.signal);
          await waitRemaining();
          if (alive) { setApiUser(next); setUser(next); setNotice(''); setLoading(false); }
          return;
        } catch (error) {
          if (!alive) return;
          if (error instanceof ApiError && error.status === 401) {
            await waitRemaining();
            if (alive) setLoading(false);
            return;
          }
          if (attempt === 4 || (error instanceof ApiError && error.status < 500)) break;
          setNotice('Starting Taskflow. A cold start can take up to two minutes...');
          await new Promise<void>(resolve => {
            retryTimer = setTimeout(resolve, Math.min(1000 * 2 ** attempt, 8000));
            controller.signal.addEventListener('abort', () => { clearTimeout(retryTimer); resolve(); }, { once: true });
          });
        }
      }
      await waitRemaining();
      if (alive) { setLoading(false); setUnavailable(true); setNotice('Cannot reach Taskflow. Check your connection and retry.'); }
    };
    void restore();
    const expired = () => { reset(); setNotice('Please sign in again.'); };
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(`taskflow:${API_ROOT}`) : null;
    authChannel.current = channel;
    if (channel) channel.onmessage = event => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.action === 'logout') expired();
      if (message.action === 'tasks' && message.userId === apiUser()?.id) {
        void invalidateTaskCache(message.userId).then(() => client.invalidateQueries());
      }
      if (message.action === 'login') {
        if (message.userId !== apiUser()?.id) reset();
        void authApi.me()
          .then(next => {
            if (!alive) return;
            if (apiUser()?.id !== next.id) { setApiUser(next); setUser(next); }
            setNotice(''); void client.invalidateQueries();
          })
          .catch(error => { if (alive && error instanceof ApiError && error.status === 401) expired(); });
      }
    };
    const mutation = (event: Event) => channel?.postMessage({ action: 'tasks', userId: (event as CustomEvent<string>).detail });
    const maintain = () => { void maintainLocalCache().catch(() => undefined); };
    maintain();
    const maintenance = setInterval(maintain, 300_000);
    window.addEventListener('taskflow:tasks-mutated', mutation);
    window.addEventListener('taskflow:session-expired', expired);
    return () => {
      alive = false; controller.abort(); clearTimeout(retryTimer); clearInterval(maintenance);
      authChannel.current = null; channel?.close();
      window.removeEventListener('taskflow:tasks-mutated', mutation);
      window.removeEventListener('taskflow:session-expired', expired);
    };
  }, [restoreAttempt]);
  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      void authApi.me().then(next => { if (next.id !== user.id) reset(); }).catch(error => {
        if (error instanceof ApiError && error.status === 401) {
          reset();
          setNotice('Please sign in again.');
        }
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, [user]);
  const notifyTabs = (action: 'login' | 'logout') => authChannel.current?.postMessage({ action, userId: apiUser()?.id });
  async function logout() {
    try { await authApi.logout(); reset(); notifyTabs('logout'); setNotice('Signed out.'); }
    catch {
      reset(); notifyTabs('logout');
      setNotice('Signed out locally, but the server session could not be ended. Reconnect and sign out again.');
    }
  }
  if (loading || unavailable || loggingIn) return <StartupScreen
    message={notice}
    unavailable={unavailable}
    statusLabel={loggingIn ? 'Authenticating' : undefined}
    onRetry={() => setRestoreAttempt(n => n + 1)}
  />;
  if (!user) return <LoginForm notice={notice} onSuccess={next => {
    reset();
    setApiUser(next);
    setNotice('Preparing your workspace...');
    setLoggingIn(true);
    notifyTabs('login');
    loginTimerRef.current = setTimeout(() => {
      setUser(next);
      setNotice('');
      setLoggingIn(false);
    }, 5000);
  }} />;
  return <QueryClientProvider client={client}>
    <Suspense fallback={<main className="taskflow-wait-page grid min-h-dvh place-content-center"><Loader3D label="Loading your tasks" size="small" /></main>}>
    <App key={user.id} user={user} onLogout={logout} />
    </Suspense>
  </QueryClientProvider>;
}

function LoginForm({ notice, onSuccess }: { notice: string; onSuccess: (user: User) => void }) {
  const [signup, setSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return;
    const userId = username.trim();
    if (!/^[A-Za-z0-9_.-]{3,32}$/.test(userId)) {
      setError('User ID must be 3–32 letters, numbers, dots, underscores or hyphens.');
      return;
    }
    if (signup && password !== confirmation) { setError('Passwords do not match.'); return; }
    if (new TextEncoder().encode(password).length > 72) { setError('Password must be at most 72 UTF-8 bytes.'); return; }
    setBusy(true); setError('');
    try { onSuccess(await (signup ? authApi.register(userId, password, confirmation) : authApi.login(userId, password))); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in'); }
    finally { setBusy(false); }
  }
  const inputStyle = "w-full border-2 border-black p-3 bg-white text-black mt-1";
  return <main className="taskflow-auth-page min-h-dvh text-black dark:text-zinc-100 grid place-items-center p-3 sm:p-6">
    <form onSubmit={submit} className="taskflow-auth-card w-full max-w-md border-2 border-black bg-white p-5 shadow-brutal space-y-4 sm:p-8 sm:space-y-5">
      <h1 className="text-3xl font-black">TASKFLOW</h1>
      <h2 className="text-xl font-bold">{signup ? 'Create your account' : 'Sign in'}</h2>
      {(error || notice) && <p role="alert" className="text-red-700">{error || notice}</p>}
      <label className="block font-bold">User ID
        <input
          className={inputStyle}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={3}
          maxLength={32}
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
      </label>
      <p className="text-xs">3–32 letters, numbers, dots, underscores or hyphens. Case insensitive.</p>
      <label className="block font-bold">Password
        <input className={inputStyle} type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={12} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} />
      </label>
      {signup && <><label className="block font-bold">Confirm password
        <input className={inputStyle} type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={confirmation} onChange={e => setConfirmation(e.target.value)} />
      </label><p className="text-xs">Use at least 12 characters. Keep your password safe: email recovery is not available.</p></>}
      <button disabled={busy} className="motion-press w-full p-3 bg-orange-500 border-2 border-black font-bold disabled:opacity-50 disabled:transform-none">{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
      <button type="button" disabled={busy} onClick={() => { setSignup(!signup); setError(''); setPassword(''); setConfirmation(''); }} className="underline">
        {signup ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>
      <p className="text-xs text-stone-600">Sign-in requires essential session cookies. Saving task data on this device is optional.</p>
    </form>
  </main>;
}
