import { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
  isSameMonth, isSameDay, format, addMonths, subMonths, setMonth,
} from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { taskApi } from '../api/taskApi';

interface Props {
  calendarMonth: Date;
  setCalendarMonth: (d: Date) => void;
  selectedDate: Date | null;
  setSelectedDate: (d: Date | null) => void;
}

export function LeftPanel({
  calendarMonth, setCalendarMonth, selectedDate, setSelectedDate,
}: Props) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(true);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const calStart = startOfWeek(start, { weekStartsOn: 1 });
    const monthCalEnd = endOfWeek(end, { weekStartsOn: 1 });
    const calEnd = addDays(monthCalEnd, 7); // Next week of next month

    const arr = [];
    let curr = calStart;
    while (curr <= calEnd) {
      arr.push(curr);
      curr = addDays(curr, 1);
    }
    return arr;
  }, [calendarMonth]);

  const { data: monthTasks, isError: calendarError, refetch: refetchCalendar } = useQuery({
    queryKey: ['calendar', calendarMonth.getFullYear(), calendarMonth.getMonth() + 1],
    queryFn: () => taskApi.getByMonth(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1)
  });
  
  const activeTasks = monthTasks || [];

  return (
    <aside
      className="w-full md:w-64 lg:w-72 xl:w-80 border-r-2 border-black dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 flex flex-col shrink-0 overflow-y-auto"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* Calendar Toggle Button */}
      <button
        type="button"
        onClick={() => setCalendarOpen(open => !open)}
        className={[
          'w-full flex items-center gap-2 px-4 py-3 border-b-2 border-black dark:border-[#4169E1] text-xs font-bold uppercase tracking-widest transition-colors',
          calendarOpen
            ? 'bg-black dark:bg-[#4169E1] text-white'
            : 'bg-stone-100 dark:bg-zinc-900 text-stone-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-800',
        ].join(' ')}
      >
        <Calendar size={16} strokeWidth={2.5} />
        <span>Calendar</span>
        <ChevronLeft
          size={14}
          strokeWidth={3}
          className={`ml-auto transition-transform duration-200 ${calendarOpen ? '-rotate-90' : 'rotate-0'}`}
        />
      </button>

      {/* Collapsible Calendar */}
      <div className={`calendar-panel ${calendarOpen ? '' : 'collapsed'}`}>
        <div>
          {/* Month Navigator */}
          <div className="p-4 border-b-2 border-black dark:border-[#4169E1] flex items-center justify-between">
            <button
              onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
              className="border-2 border-black dark:border-[#4169E1] w-7 h-7 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-[#4169E1] transition-colors shadow-brutal-sm dark:shadow-[#ffffff]"
            >
              <ChevronLeft size={16} strokeWidth={3} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="text-sm font-bold uppercase tracking-wider hover:text-orange-600 transition-colors"
              >
                {format(calendarMonth, 'MMMM yyyy')}
              </button>

              {showMonthPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMonthPicker(false)} />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 border-2 border-black dark:border-[#4169E1] bg-white dark:bg-black shadow-brutal dark:shadow-[#ffffff] z-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setCalendarMonth(subMonths(calendarMonth, 12))}
                        className="border-2 border-black dark:border-[#4169E1] px-2 py-1 text-xs font-bold hover:bg-black hover:text-white dark:hover:bg-[#4169E1]"
                      >
                        ‹ YR
                      </button>
                      <span className="font-bold">{format(calendarMonth, 'yyyy')}</span>
                      <button
                        onClick={() => setCalendarMonth(addMonths(calendarMonth, 12))}
                        className="border-2 border-black dark:border-[#4169E1] px-2 py-1 text-xs font-bold hover:bg-black hover:text-white dark:hover:bg-[#4169E1]"
                      >
                        YR ›
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => { setCalendarMonth(setMonth(calendarMonth, i)); setShowMonthPicker(false); }}
                          className={[
                            'border-2 border-black dark:border-[#4169E1] py-1 text-xs font-bold uppercase transition-colors',
                            calendarMonth.getMonth() === i
                              ? 'bg-black dark:bg-[#4169E1] text-white'
                              : 'hover:bg-orange-500 hover:text-white',
                          ].join(' ')}
                        >
                          {format(setMonth(new Date(2026, 0, 1), i), 'MMM')}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
              className="border-2 border-black dark:border-[#4169E1] w-7 h-7 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-[#4169E1] transition-colors shadow-brutal-sm dark:shadow-[#ffffff]"
            >
              <ChevronRight size={16} strokeWidth={3} />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4 border-b-2 border-black dark:border-[#4169E1] bg-stone-200 dark:bg-[#333333] transition-colors">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold bg-black dark:bg-[#4169E1] text-orange-500 py-1 uppercase transition-colors">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const isCurrentMonth = isSameMonth(day, calendarMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isSameDay(day, new Date());
                const hasTasks = activeTasks.some(entry => entry.remaining > 0 && entry.date === format(day, 'yyyy-MM-dd'));

                const isHighlighted = isSelected || isTodayDate;

                return (
                  <button
                    key={i}
                    disabled={!isCurrentMonth}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={[
                      'aspect-square border-2 flex flex-col items-center justify-center relative transition-all text-xs font-light',
                      isCurrentMonth && !isHighlighted
                        ? 'border-black dark:border-[#4169E1] bg-white dark:bg-black shadow-[2px_2px_0px_0px_#000] dark:shadow-[#ffffff] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#ffffff]'
                        : '',
                      !isCurrentMonth ? 'border-transparent bg-transparent text-stone-500 dark:text-stone-400 cursor-default' : '',
                      isSelected && isTodayDate
                        ? 'border-black dark:border-[#4169E1] bg-orange-500 text-white shadow-[2px_2px_0px_0px_#000] dark:shadow-[#ffffff] translate-x-0 translate-y-0'
                        : isSelected
                          ? 'border-black dark:border-[#4169E1] bg-yellow-400 text-black shadow-[2px_2px_0px_0px_#000] dark:shadow-[#ffffff] translate-x-0 translate-y-0'
                          : isTodayDate
                            ? 'border-black dark:border-[#4169E1] bg-orange-500 text-white shadow-[2px_2px_0px_0px_#000] dark:shadow-[#ffffff] translate-x-0 translate-y-0'
                            : '',
                    ].join(' ')}
                  >
                    {format(day, 'd')}
                    {hasTasks && isCurrentMonth && (
                      <div className={`absolute bottom-1 w-1.5 h-1.5 border border-black ${isHighlighted ? 'bg-white' : 'bg-orange-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {calendarError && <div role="alert" className="p-3 text-xs bg-red-100 dark:bg-red-950">Calendar unavailable. <button onClick={() => void refetchCalendar()} className="underline font-bold">Retry</button></div>}
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-auto p-4 border-t-2 border-black dark:border-[#4169E1]">
        <div className="text-[10px] text-stone-400 tracking-widest mb-1">SHORTCUTS</div>
        <div className="space-y-0.5 text-[10px] text-stone-400">
          <div>[N] New task · [/] Search · [Esc] Close</div>
        </div>
      </div>
    </aside>
  );
}
