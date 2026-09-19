import { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
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
  calendarOpen: boolean;
  setCalendarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function LeftPanel({
  calendarMonth, setCalendarMonth, selectedDate, setSelectedDate,
  calendarOpen, setCalendarOpen,
}: Props) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);

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
      id="taskflow-sidebar"
      className={[
        'border-black dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 flex flex-col shrink-0 select-none overflow-hidden transition-[width] duration-300 ease-in-out',
        // Desktop: height full, border-r-2, width transitions between w-72 (or w-80) and w-12
        'md:h-full md:border-r-2 md:border-b-0',
        calendarOpen ? 'md:w-72 lg:w-80' : 'md:w-12',
        // Mobile: full width, border-b-2
        'w-full border-b-2',
      ].join(' ')}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* ========================================================
          DESKTOP: RETRACTED RAIL (Visible only on md+ when closed)
         ======================================================== */}
      {!calendarOpen && (
        <div
          onClick={() => setCalendarOpen(true)}
          className="hidden md:flex flex-col items-center justify-between h-full w-12 py-3 cursor-pointer bg-stone-100 dark:bg-zinc-950 hover:bg-stone-200 dark:hover:bg-zinc-900 transition-colors group"
          title="Expand calendar"
        >
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center border-2 border-black dark:border-[#4169E1] bg-white dark:bg-black text-black dark:text-white shadow-brutal-sm dark:shadow-[#ffffff] group-hover:bg-orange-500 group-hover:text-white transition-colors"
              title="Expand calendar"
            >
              <Calendar size={15} strokeWidth={2.5} />
            </button>
            <ChevronRight
              size={13}
              strokeWidth={3}
              className="text-stone-400 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-0.5 transition-all"
            />
          </div>

          {selectedDate && (
            <div
              className="w-7 h-7 flex items-center justify-center bg-orange-500 text-white text-[10px] font-black border border-black dark:border-white shadow-sm"
              title={`Filtered: ${format(selectedDate, 'PPP')}`}
            >
              {format(selectedDate, 'd')}
            </div>
          )}

          <div className="flex-1 flex items-center justify-center py-4">
            <span
              className="writing-v text-[11px] font-bold tracking-[0.25em] uppercase text-stone-500 dark:text-zinc-400 group-hover:text-orange-500 transition-colors"
            >
              CALENDAR
            </span>
          </div>

          <div className="text-[10px] text-stone-400 group-hover:text-black dark:group-hover:text-white font-bold transition-colors">
            ▶
          </div>
        </div>
      )}

      {/* ========================================================
          DESKTOP: EXPANDED FULL PANEL (Visible only on md+ when open)
         ======================================================== */}
      {calendarOpen && (
        <div className="hidden md:flex flex-col h-full w-full">
          {/* Header with Retract button */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b-2 border-black dark:border-[#4169E1] bg-black dark:bg-[#4169E1] text-white">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <Calendar size={15} strokeWidth={2.5} />
              <span>Calendar</span>
            </div>
            <button
              type="button"
              onClick={() => setCalendarOpen(false)}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider border border-white/40 hover:border-white hover:bg-white/20 px-2 py-0.5 transition-colors"
              title="Retract calendar to left"
            >
              <span>Retract</span>
              <ChevronLeft size={13} strokeWidth={3} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Active Selected Date banner */}
            {selectedDate && (
              <div className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-950/40 border-b border-black dark:border-zinc-700 flex items-center justify-between text-xs">
                <span className="font-bold text-[11px] truncate">
                  📅 {format(selectedDate, 'EEE, MMM d')}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-[10px] font-bold underline hover:text-red-600 transition-colors ml-2"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Month Navigator */}
            <div className="p-3 border-b-2 border-black dark:border-[#4169E1] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                className="border-2 border-black dark:border-[#4169E1] w-7 h-7 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-[#4169E1] transition-colors shadow-brutal-sm dark:shadow-[#ffffff]"
                title="Previous month"
              >
                <ChevronLeft size={15} strokeWidth={3} />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMonthPicker(!showMonthPicker)}
                  className="text-xs font-bold uppercase tracking-wider hover:text-orange-600 transition-colors"
                >
                  {format(calendarMonth, 'MMMM yyyy')}
                </button>

                {showMonthPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMonthPicker(false)} />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 border-2 border-black dark:border-[#4169E1] bg-white dark:bg-black shadow-brutal dark:shadow-[#ffffff] z-50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => setCalendarMonth(subMonths(calendarMonth, 12))}
                          className="border-2 border-black dark:border-[#4169E1] px-2 py-1 text-xs font-bold hover:bg-black hover:text-white dark:hover:bg-[#4169E1]"
                        >
                          ‹ YR
                        </button>
                        <span className="font-bold">{format(calendarMonth, 'yyyy')}</span>
                        <button
                          type="button"
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
                            type="button"
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
                type="button"
                onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                className="border-2 border-black dark:border-[#4169E1] w-7 h-7 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-[#4169E1] transition-colors shadow-brutal-sm dark:shadow-[#ffffff]"
                title="Next month"
              >
                <ChevronRight size={15} strokeWidth={3} />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-3 border-b-2 border-black dark:border-[#4169E1] bg-stone-200 dark:bg-[#333333] transition-colors">
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
                      type="button"
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

            {calendarError && (
              <div role="alert" className="p-3 text-xs bg-red-100 dark:bg-red-950">
                Calendar unavailable. <button type="button" onClick={() => void refetchCalendar()} className="underline font-bold">Retry</button>
              </div>
            )}

            {/* Shortcuts hint at bottom */}
            <div className="mt-auto p-3 border-t-2 border-black dark:border-[#4169E1]">
              <div className="text-[10px] text-stone-400 tracking-widest mb-1">SHORTCUTS</div>
              <div className="space-y-0.5 text-[10px] text-stone-400">
                <div>[N] New task · [/] Search · [Esc] Close</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MOBILE: COMPACT BAR + ACCORDION (Visible only on < md)
         ======================================================== */}
      <div className="md:hidden flex flex-col w-full">
        {/* Slim Toggle Bar (h-10 / 40px) */}
        <button
          type="button"
          onClick={() => setCalendarOpen(open => !open)}
          className="w-full h-10 px-3 flex items-center justify-between bg-stone-100 dark:bg-zinc-900 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-stone-200 dark:hover:bg-zinc-800"
        >
          <div className="flex items-center gap-2">
            <Calendar size={14} strokeWidth={2.5} className="text-orange-500" />
            <span>Calendar</span>
          </div>

          <div className="flex items-center gap-2">
            {selectedDate && (
              <span
                onClick={(e) => { e.stopPropagation(); setSelectedDate(null); }}
                className="bg-orange-500 text-white text-[10px] px-2 py-0.5 font-bold flex items-center gap-1 shadow-sm"
                title="Clear date filter"
              >
                {format(selectedDate, 'MMM d')}
                <X size={11} strokeWidth={3} />
              </span>
            )}
            <ChevronDown
              size={15}
              strokeWidth={3}
              className={`transition-transform duration-200 ${calendarOpen ? 'rotate-180 text-orange-500' : 'text-stone-500'}`}
            />
          </div>
        </button>

        {/* Retractable Calendar Body (retracts from top to bottom) */}
        <div className={`calendar-panel ${calendarOpen ? '' : 'collapsed'}`}>
          <div className="bg-stone-50 dark:bg-zinc-950 border-t border-black/10 dark:border-zinc-800">
            {/* Compact Month Bar */}
            <div className="px-3 py-2 flex items-center justify-between border-b border-black/10 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                className="border border-black dark:border-[#4169E1] w-6 h-6 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-[#4169E1]"
              >
                <ChevronLeft size={13} strokeWidth={3} />
              </button>
              <span className="text-xs font-bold uppercase tracking-wider">
                {format(calendarMonth, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                className="border border-black dark:border-[#4169E1] w-6 h-6 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-[#4169E1]"
              >
                <ChevronRight size={13} strokeWidth={3} />
              </button>
            </div>

            {/* Compact Grid */}
            <div className="p-2.5 bg-stone-200 dark:bg-[#333333]">
              <div className="grid grid-cols-7 gap-1 mb-1.5">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                  <div key={d} className="text-center text-[9px] font-bold bg-black dark:bg-[#4169E1] text-orange-500 py-0.5 uppercase">{d}</div>
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
                      type="button"
                      disabled={!isCurrentMonth}
                      onClick={() => {
                        setSelectedDate(isSelected ? null : day);
                        // Auto-retract on mobile after selection so user immediately sees filtered tasks!
                        setCalendarOpen(false);
                      }}
                      className={[
                        'aspect-square border flex flex-col items-center justify-center relative text-[11px] font-medium h-7',
                        isCurrentMonth && !isHighlighted ? 'border-black dark:border-[#4169E1] bg-white dark:bg-black' : '',
                        !isCurrentMonth ? 'border-transparent text-stone-400 dark:text-stone-600' : '',
                        isSelected
                          ? 'border-black dark:border-[#4169E1] bg-yellow-400 text-black font-bold'
                          : isTodayDate
                            ? 'border-black dark:border-[#4169E1] bg-orange-500 text-white font-bold'
                            : '',
                      ].join(' ')}
                    >
                      {format(day, 'd')}
                      {hasTasks && isCurrentMonth && (
                        <div className={`absolute bottom-0.5 w-1 h-1 ${isHighlighted ? 'bg-white' : 'bg-orange-500'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDate && (
              <div className="p-2 border-t border-black/10 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-stone-600 dark:text-zinc-400">
                  Active filter: <strong>{format(selectedDate, 'PPP')}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => { setSelectedDate(null); setCalendarOpen(false); }}
                  className="text-xs font-bold text-red-600 underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
