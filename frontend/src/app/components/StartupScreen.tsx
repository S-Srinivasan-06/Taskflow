import { RefreshCw } from 'lucide-react';
import { Loader3D } from './Loader3D';

interface StartupScreenProps {
  message: string;
  unavailable: boolean;
  onRetry: () => void;
}

export function StartupScreen({ message, unavailable, onRetry }: StartupScreenProps) {
  return (
    <main className="taskflow-wait-page min-h-dvh overflow-hidden px-4 py-8 text-black dark:text-zinc-100">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-2xl place-content-center text-center">
        <div className="taskflow-enter"><Loader3D label="Starting Taskflow" showOrbitDots /></div>

        <p className="mt-7 font-mono text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 dark:text-orange-400">
          {unavailable ? 'Render is taking a power nap' : 'Calling the server'}
        </p>
        <h1 className="mt-3 text-balance text-2xl font-black uppercase sm:text-4xl">
          {unavailable ? 'Taskflow needs another nudge.' : 'Waking up your workspace.'}
        </h1>
        <p role="status" aria-live="polite" className="mx-auto mt-4 max-w-md text-sm leading-6 text-stone-600 dark:text-zinc-400">
          {message || 'The Taskflow backend runs on Render and may take up to two minutes to wake.'}
        </p>

        <div className="mx-auto mt-6 flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-stone-500" aria-hidden="true">
          <span className="startup-status-dot" />
          <span className="startup-status-dot" />
          <span className="startup-status-dot" />
          <span>{unavailable ? 'Paused' : 'Please keep this tab open'}</span>
        </div>

        {unavailable ? (
          <button
            type="button"
            onClick={onRetry}
            className="motion-press mx-auto mt-8 flex items-center gap-2 border-2 border-black bg-orange-500 px-5 py-3 font-mono text-xs font-black uppercase shadow-[4px_4px_0_#000] dark:border-zinc-200 dark:shadow-[4px_4px_0_#e4e4e7]"
          >
            <RefreshCw size={16} strokeWidth={3} />
            Wake it again
          </button>
        ) : null}
      </div>
    </main>
  );
}
