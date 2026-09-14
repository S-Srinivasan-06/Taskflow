import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authApi, setApiUser, apiUser, User, ApiError } from '../api/http';
import { clearLocalCache } from '../cache/localCache';
import App from '../App';

export default function AuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const authChannel = useRef<BroadcastChannel | null>(null);
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: {
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
    staleTime: 30_000, gcTime: 300_000,
  } } }));
  function reset() {
    const previous = apiUser();
    setApiUser(null);
    client.clear();
    setUser(null);
    if (previous) void clearLocalCache(previous.id);
  }
  useEffect(() => {
    let alive = true;
    const restore = async () => {
      try { const next = await authApi.me(); if (alive) { setApiUser(next); setUser(next); } }
      catch (error) { if (alive && !(error instanceof ApiError && error.status === 401)) setNotice('Cannot reach Taskflow. Check the connection and try again.'); }
      finally { if (alive) setLoading(false); }
    };
    void restore();
    const expired = () => { reset(); setNotice('Please sign in again.'); };
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('taskflow-auth') : null;
    authChannel.current = channel;
    if (channel) channel.onmessage = event => {
      if (event.data === 'logout') expired();
      if (event.data === 'login') {
        reset();
        void authApi.me()
          .then(next => { setApiUser(next); setUser(next); setNotice(''); })
          .catch(() => expired());
      }
    };
    window.addEventListener('taskflow:session-expired', expired);
    return () => { alive = false; authChannel.current = null; channel?.close(); window.removeEventListener('taskflow:session-expired', expired); };
  }, []);
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
  const notifyTabs = (action: 'login' | 'logout') => authChannel.current?.postMessage(action);
  async function logout() {
    try { await authApi.logout(); reset(); notifyTabs('logout'); setNotice('Signed out.'); }
    catch {
      reset(); notifyTabs('logout');
      setNotice('Signed out locally, but the server session could not be ended. Reconnect and sign out again.');
    }
  }
  if (loading) return <div className="min-h-screen grid place-items-center">Checking your session…</div>;
  if (!user) return <LoginForm notice={notice} onSuccess={next => {
    reset(); setApiUser(next); setUser(next); setNotice(''); notifyTabs('login');
  }} />;
  return <QueryClientProvider client={client}>
    <App key={user.id} user={user} onLogout={logout} notice={notice} />
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
    if (signup && password !== confirmation) { setError('Passwords do not match.'); return; }
    if (new TextEncoder().encode(password).length > 72) { setError('Password must be at most 72 UTF-8 bytes.'); return; }
    setBusy(true); setError('');
    try { onSuccess(await (signup ? authApi.register(username, password, confirmation) : authApi.login(username, password))); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in'); }
    finally { setBusy(false); }
  }
  const inputStyle = "w-full border-2 border-black p-3 bg-white text-black mt-1";
  return <main className="min-h-screen bg-stone-100 text-black grid place-items-center p-6">
    <form onSubmit={submit} className="w-full max-w-md border-2 border-black bg-white p-8 shadow-brutal space-y-5">
      <h1 className="text-3xl font-black">TASKFLOW</h1>
      <h2 className="text-xl font-bold">{signup ? 'Create your account' : 'Sign in'}</h2>
      {(error || notice) && <p role="alert" className="text-red-700">{error || notice}</p>}
      <label className="block font-bold">User ID
        <input className={inputStyle} autoComplete="username" required pattern="[A-Za-z0-9_.-]{3,32}" minLength={3} maxLength={32} value={username} onChange={e => setUsername(e.target.value)} />
      </label>
      <p className="text-xs">3–32 letters, numbers, dots, underscores or hyphens. Case insensitive.</p>
      <label className="block font-bold">Password
        <input className={inputStyle} type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={12} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} />
      </label>
      {signup && <><label className="block font-bold">Confirm password
        <input className={inputStyle} type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={confirmation} onChange={e => setConfirmation(e.target.value)} />
      </label><p className="text-xs">Use at least 12 characters. Keep your password safe: email recovery is not available.</p></>}
      <button disabled={busy} className="w-full p-3 bg-orange-500 border-2 border-black font-bold disabled:opacity-50">{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
      <button type="button" disabled={busy} onClick={() => { setSignup(!signup); setError(''); setPassword(''); setConfirmation(''); }} className="underline">
        {signup ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>
      <p className="text-xs text-stone-600">Sign-in requires essential session cookies. Saving task data on this device is optional.</p>
    </form>
  </main>;
}
