import { useEffect, useRef, useState } from 'react';
import { ChevronDown, HardDrive, LogOut, Plus } from 'lucide-react';
import { ClockWidget } from './ClockWidget';
import { DarkModeToggle } from './DarkModeToggle';
import logo from '../../assets/logo.svg';

interface Props {
  onNewTask: () => void;
  timezone: string;
  setTimezone: (tz: string) => void;
  username: string;
  localCache: boolean;
  onLocalCacheChange: (enabled: boolean) => void;
  onLogout: () => void;
}

export function Topbar({
  onNewTask, timezone, setTimezone, username,
  localCache, onLocalCacheChange, onLogout,
}: Props) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountOpen]);

  return (
    <header className="h-14 border-b-2 border-black dark:border-zinc-700 bg-zinc-950 dark:bg-zinc-900 text-white flex items-center justify-between px-6 shrink-0 relative z-30">
      <div className="flex min-w-0 items-center gap-3">
        <img src={logo} alt="Taskflow" className="h-9 w-auto shrink-0 object-contain" />
        <div ref={accountRef} className="relative">
          <button
            type="button"
            onClick={() => setAccountOpen(open => !open)}
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            className="flex max-w-56 items-center gap-2 border-l border-white/30 pl-3 text-left font-mono text-[10px] font-bold uppercase tracking-wide text-stone-300 hover:text-white"
          >
            <span className="truncate">
              <span className="hidden text-stone-500 sm:inline">Signed in as </span>
              {username}
            </span>
            <ChevronDown
              size={15}
              strokeWidth={3}
              className={`shrink-0 transition-transform ${accountOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {accountOpen && (
            <div
              role="menu"
              className="absolute left-3 top-[calc(100%+1rem)] w-72 border-2 border-black dark:border-zinc-600 bg-white dark:bg-zinc-800 p-2 font-mono text-black dark:text-zinc-100 shadow-[4px_4px_0_0_#f97316]"
            >
              <label className="flex cursor-pointer items-start gap-3 p-3 hover:bg-stone-100 dark:hover:bg-zinc-700">
                <HardDrive size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black uppercase">Save on this device</span>
                  <span className="mt-1 block text-[10px] leading-4 text-stone-600 dark:text-zinc-400">
                    Keep task reads and preferences in this browser.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={localCache}
                  onChange={event => onLocalCacheChange(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-orange-500"
                />
              </label>
              <div className="mx-3 border-t border-black/20 dark:border-zinc-600" />
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                className="flex w-full items-center gap-3 p-3 text-left text-xs font-black uppercase hover:bg-red-600 hover:text-white"
              >
                <LogOut size={18} strokeWidth={2.5} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
        <ClockWidget timezone={timezone} setTimezone={setTimezone} />
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <DarkModeToggle />
        <button
          onClick={onNewTask}
          className="flex items-center gap-2 bg-orange-500 text-black border-2 border-transparent px-4 py-1.5 font-mono text-xs font-bold shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] dark:shadow-[#ffffff] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] dark:hover:shadow-[4px_4px_0px_0px_#ffffff] transition-all"
        >
          <Plus size={16} strokeWidth={3} /> NEW TASK
        </button>
      </div>
    </header>
  );
}
