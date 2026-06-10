import { useState, useEffect } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { TIMEZONES } from './types';

interface Props {
  timezone: string;
  setTimezone: (tz: string) => void;
}

export function ClockWidget({ timezone, setTimezone }: Props) {
  const [now, setNow] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(now).toUpperCase();

  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  const tzLabel = TIMEZONES.find(t => t.value === timezone)?.label.split(' — ')[0] || timezone;

  return (
    <div className="relative flex items-center gap-3 border-2 border-black bg-orange-500 text-white px-4 py-1.5 shadow-[2px_2px_0px_0px_#000]">
      <Clock size={16} strokeWidth={2.5} className="text-white" />
      <div className="font-mono text-xs font-bold tracking-tight leading-tight">
        <div>{dateStr}</div>
        <div>{timeStr} <span className="text-black">{tzLabel}</span></div>
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ml-2 border-2 border-black p-0.5 hover:bg-black hover:text-white transition-colors"
      >
        <ChevronDown size={14} strokeWidth={3} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-56 border-2 border-black bg-white text-black shadow-[2px_2px_0px_0px_#000] z-50 max-h-80 overflow-y-auto">
            {TIMEZONES.map(tz => (
              <button
                key={tz.value}
                onClick={() => { setTimezone(tz.value); setIsOpen(false); }}
                className={`w-full text-left px-3 py-2 font-mono text-[11px] border-b border-stone-200 last:border-b-0 hover:bg-orange-500 hover:text-white transition-colors ${timezone === tz.value ? 'bg-black text-white' : ''}`}
              >
                {tz.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
