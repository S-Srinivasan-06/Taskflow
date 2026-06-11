import { Plus } from 'lucide-react';
import { ClockWidget } from './ClockWidget';
import { DarkModeToggle } from './DarkModeToggle';
import logo from '../../assets/logo.svg';

interface Props {
  onNewTask: () => void;
  timezone: string;
  setTimezone: (tz: string) => void;
}

export function Topbar({ onNewTask, timezone, setTimezone }: Props) {
  return (
    <header className="h-14 border-b-2 border-black bg-black text-white flex items-center justify-between px-6 shrink-0 relative z-30">
      <div className="flex items-center">
        <img src={logo} alt="Taskflow Logo" className="h-9 object-contain" />
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <ClockWidget timezone={timezone} setTimezone={setTimezone} />
      </div>

      <div className="flex items-center gap-4">
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
