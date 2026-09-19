import { RefreshCw, Server } from 'lucide-react';
import logo from '../../assets/logo.svg';

interface StartupScreenProps {
  message: string;
  unavailable: boolean;
  onRetry: () => void;
}

export function StartupScreen({ message, unavailable, onRetry }: StartupScreenProps) {
  return (
    <main className="taskflow-boot-grid min-h-dvh overflow-hidden bg-stone-100 px-4 py-8 text-black dark:bg-[#121316] dark:text-zinc-100">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-2xl place-content-center text-center">
        <div className="taskflow-boot-scene mx-auto mb-8" aria-hidden="true">
          <div className="taskflow-boot-orbit" />
          <div className="taskflow-boot-card taskflow-boot-card-a">WAKE</div>
          <div className="taskflow-boot-card taskflow-boot-card-b">SYNC</div>
          <div className="taskflow-boot-card taskflow-boot-card-c">GO!</div>
          <div className="taskflow-boot-core">
            <img src={logo} alt="" className="w-28 sm:w-36" />
            <Server size={22} strokeWidth={2.5} />
          </div>
        </div>

        <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-orange-600 dark:text-orange-400">
          {unavailable ? 'Render is taking a power nap' : 'Calling the server'}
        </p>
        <h1 className="mt-3 text-balance text-2xl font-black uppercase sm:text-4xl">
          {unavailable ? 'Taskflow needs another nudge.' : 'Waking up your workspace.'}
        </h1>
        <p role="status" aria-live="polite" className="mx-auto mt-4 max-w-md text-sm leading-6 text-stone-600 dark:text-zinc-400">
          {message || 'The free server may need about a minute to stretch, yawn, and reconnect.'}
        </p>

        <div className="mx-auto mt-6 flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-stone-500" aria-hidden="true">
          <span className="taskflow-boot-dot" />
          <span className="taskflow-boot-dot" />
          <span className="taskflow-boot-dot" />
          <span>{unavailable ? 'Paused' : 'Please keep this tab open'}</span>
        </div>

        {unavailable && (
          <button
            type="button"
            onClick={onRetry}
            className="mx-auto mt-8 flex items-center gap-2 border-2 border-black bg-orange-500 px-5 py-3 font-mono text-xs font-black uppercase shadow-[4px_4px_0_#000] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 dark:border-zinc-200 dark:shadow-[4px_4px_0_#e4e4e7]"
          >
            <RefreshCw size={16} strokeWidth={3} />
            Wake it again
          </button>
        )}
      </div>
    </main>
  );
}