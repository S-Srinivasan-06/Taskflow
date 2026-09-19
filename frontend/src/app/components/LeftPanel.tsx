import { useMemo, useRef, useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
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
  const reduced = useReducedMotion() === true;
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [width, setWidth] = useState(280);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);

  const drag = useRef<{ x: number; width: number } | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current) return;
    const newWidth = Math.max(220, Math.min(380, drag.current.width + event.clientX - drag.current.x));
    setWidth(newWidth);
  };

  // Exactly bounds the calendar to the full weeks of this month (no extra 7th row)
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const calStart = startOfWeek(start, { weekStartsOn: 1 });
    const calEnd = endOfWeek(end, { weekStartsOn: 1 });

    const arr: Date[] = [];
    let curr = calStart;
    while (curr <= calEnd) {
      arr.push(curr);
      curr = addDays(curr, 1);
    }
    return arr;
  }, [calendarMonth]);

  const { data: monthTasks, isError: calendarError, refetch: refetchCalendar } = useQuery({
    queryKey: ['calendar', calendarMonth.getFullYear(), calendarMonth.getMonth() + 1],
    queryFn: () => taskApi.getByMonth(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1),
  });
  
  const activeTasks = monthTasks || [];

  const actualWidth = calendarOpen ? width : 56;

  return (
    <motion.aside
      id="taskflow-sidebar"
      animate={{
        width: isDesktop ? actualWidth : '100%',
      }}
      transition={{
        duration: reduced ? 0 : 0.24,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={[
        'relative border-black dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 flex flex-col shrink-0 select-none',
        'md:h-full md:border-r-2 md:border-b-0 border-b-2',
        isDesktop ? 'overflow-visible' : 'overflow-hidden',
      ].join(' ')}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* ========================================================
          DESKTOP: RETRACTED RAIL (width 56px when closed)
         ======================================================== */}
      {isDesktop && !calendarOpen && (
        <div
          onClick={() => setCalendarOpen(true)}
          className="flex flex-col items-center justify-between h-full w-full py-3 cursor-pointer bg-stone-100 dark:bg-zinc-950 hover:bg-stone-200 dark:hover:bg-zinc-900 transition-colors group overflow-hidden"
          title="Expand calendar"
        >
          <div className="flex flex-col items-center gap-2.5">
            <button
              type="button"
              aria-label="Expand sidebar"
              onClick={(e) => { e.stopPropagation(); setCalendarOpen(true); }}
              className="grid size-7 place-items-center border-2 border-black dark:border-[#4169E1] bg-white dark:bg-black text-black dark:text-white shadow-brutal-sm dark:shadow-[#ffffff] group-hover:bg-orange-500 group-hover:text-white transition-colors text-xs font-black"
              title="Expand calendar (→)"
            >
              →
            </button>
            <Calendar size={15} strokeWidth={2.5} className="text-stone-500 group-hover:text-orange-500 transition-colors mt-1" />
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
              className="writing-v text-[11px] font-black tracking-[0.25em] uppercase text-stone-500 dark:text-zinc-400 group-hover:text-orange-500 transition-colors"
            >
              CALENDAR
            </span>
          </div>

          <div className="text-[10px] text-stone-400 group-hover:text-black dark:group-hover:text-white font-bold transition-colors">
            →
          </div>
        </div>
      )}

      {/* ========================================================
          DESKTOP: EXPANDED PANEL (width 220px-380px resizable)
         ======================================================== */}
      {isDesktop && calendarOpen && (
        <div className="flex flex-col h-full w-full overflow-hidden">
          {/* Header with Collapse Arrow button */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b-2 border-black dark:border-[#4169E1] bg-black dark:bg-[#4169E1] text-white shrink-0">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider truncate">
              <Calendar size={15} strokeWidth={2.5} className="shrink-0" />
              <span className="truncate">Calendar</span>
            </div>
            <button
              type="button"
              aria-label="Collapse sidebar"
              onClick={() => setCalendarOpen(false)}
              className="grid size-6 place-items-center border border-white/60 hover:border-white bg-white/10 hover:bg-white hover:text-black transition-colors text-xs font-black shrink-0"
              title="Retract calendar (←)"
            >
              ←
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 flex flex-col overflow-y-auto min-w-[200px]">
            {/* Active Selected Date banner */}
            {selectedDate && (
              <div className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-950/40 border-b border-black dark:border-zinc-700 flex items-center justify-between text-xs shrink-0">
                <span className="font-bold text-[11px] truncate">
                  📅 {format(selectedDate, 'EEE, MMM d')}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-[10px] font-bold underline hover:text-red-600 transition-colors ml-2 shrink-0"
                >
                  Clear
                </button>
              </div>
            )}

            {/* Month Navigator */}
            <div className="p-3 border-b-2 border-black dark:border-[#4169E1] flex items-center justify-between shrink-0">
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
                  className="text-xs font-black uppercase tracking-wider hover:text-orange-600 transition-colors"
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

            {/* Calendar Grid (Strict 5-week or 6-week layout, consistent boxes) */}
            <div className="p-3 border-b-2 border-black dark:border-[#4169E1] bg-stone-200 dark:bg-[#333333] transition-colors shrink-0">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                  <div key={d} className="text-center text-[10px] font-black bg-black dark:bg-[#4169E1] text-orange-500 py-1 uppercase transition-colors">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const isCurrentMonth = isSameMonth(day, calendarMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isSameDay(day, new Date());
                  const hasTasks = activeTasks.some(entry => entry.remaining > 0 && entry.date === format(day, 'yyyy-MM-dd'));

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!isCurrentMonth}
                      onClick={() => setSelectedDate(isSelected ? null : day)}
                      className={[
                        'aspect-square flex flex-col items-center justify-center relative text-xs transition-all font-mono',
                        isCurrentMonth
                          ? isSelected && isTodayDate
                            ? 'border-2 border-black dark:border-[#4169E1] bg-orange-500 text-white font-bold shadow-[2px_2px_0px_0px_#000] dark:shadow-[#ffffff]'
                            : isSelected
                              ? 'border-2 border-black dark:border-[#4169E1] bg-yellow-400 text-black font-bold shadow-[2px_2px_0px_0px_#000] dark:shadow-[#ffffff]'
                              : isTodayDate
                                ? 'border-2 border-black dark:border-[#4169E1] bg-orange-500 text-white font-bold shadow-[2px_2px_0px_0px_#000] dark:shadow-[#ffffff]'
                                : 'border-2 border-black dark:border-[#4169E1] bg-white dark:bg-black text-black dark:text-zinc-100 shadow-[2px_2px_0px_0px_#000] dark:shadow-[#ffffff] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[3px_3px_0px_0px_#ffffff]'
                          : 'border border-dashed border-stone-300 dark:border-zinc-800 text-stone-300 dark:text-zinc-700 bg-stone-100/40 dark:bg-zinc-900/30 cursor-default select-none',
                      ].join(' ')}
                    >
                      {format(day, 'd')}
                      {hasTasks && isCurrentMonth && (
                        <div className={`absolute bottom-0.5 sm:bottom-1 w-1.5 h-1.5 border border-black ${isSelected || isTodayDate ? 'bg-white' : 'bg-orange-500'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {calendarError && (
              <div role="alert" className="p-3 text-xs bg-red-100 dark:bg-red-950 shrink-0">
                Calendar unavailable. <button type="button" onClick={() => void refetchCalendar()} className="underline font-bold">Retry</button>
              </div>
            )}

            {/* Shortcuts hint at bottom */}
            <div className="mt-auto p-3 border-t-2 border-black dark:border-[#4169E1] shrink-0">
              <div className="text-[10px] text-stone-400 tracking-widest mb-1">SHORTCUTS</div>
              <div className="space-y-0.5 text-[10px] text-stone-400">
                <div>[N] New · [/] Search · [Esc] Close</div>
              </div>
            </div>
          </div>

          {/* Draggable Resize Handle */}
          <button
            type="button"
            aria-label="Resize calendar sidebar"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = { x: event.clientX, width };
            }}
            onPointerMove={onPointerMove}
            onPointerUp={() => { drag.current = null; }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') setWidth((v) => Math.min(380, v + 16));
              if (event.key === 'ArrowLeft') setWidth((v) => Math.max(220, v - 16));
              if (event.key === 'Home') setWidth(220);
              if (event.key === 'End') setWidth(380);
            }}
            className="absolute inset-y-0 -right-1.5 w-3 cursor-col-resize z-30 outline-none hover:bg-orange-500/50 active:bg-orange-500 transition-colors focus-visible:bg-orange-500/50"
            title="Drag to resize sidebar (or use Left/Right arrows)"
          />
        </div>
      )}

      {/* ========================================================
          MOBILE: COMPACT ACCORDION (Visible only on < md)
         ======================================================== */}
      {!isDesktop && (
        <div className="flex flex-col w-full">
          {/* Slim Toggle Bar (h-10 / 40px) */}
          <button
            type="button"
            onClick={() => setCalendarOpen(open => !open)}
            className="w-full h-10 px-3 flex items-center justify-between bg-stone-100 dark:bg-zinc-900 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-stone-200 dark:hover:bg-zinc-800 shrink-0"
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

          {/* Compact Animated Retractable Calendar Body */}
          <motion.div
            initial={false}
            animate={{
              height: calendarOpen ? 'auto' : 0,
              opacity: calendarOpen ? 1 : 0,
            }}
            transition={{
              duration: reduced ? 0 : 0.22,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="overflow-hidden bg-stone-50 dark:bg-zinc-950 border-t border-black/10 dark:border-zinc-800"
          >
            {/* Compact Month Bar */}
            <div className="px-3 py-1.5 flex items-center justify-between border-b border-black/10 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                className="border border-black dark:border-[#4169E1] w-6 h-6 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-[#4169E1] text-xs font-bold"
              >
                ‹
              </button>
              <span className="text-xs font-bold uppercase tracking-wider">
                {format(calendarMonth, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                className="border border-black dark:border-[#4169E1] w-6 h-6 flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-[#4169E1] text-xs font-bold"
              >
                ›
              </button>
            </div>

            {/* Compact Grid (Exact month bounds, tight height) */}
            <div className="p-2 bg-stone-200 dark:bg-[#333333]">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                  <div key={d} className="text-center text-[9px] font-black bg-black dark:bg-[#4169E1] text-orange-500 py-0.5 uppercase">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  const isCurrentMonth = isSameMonth(day, calendarMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isSameDay(day, new Date());
                  const hasTasks = activeTasks.some(entry => entry.remaining > 0 && entry.date === format(day, 'yyyy-MM-dd'));

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!isCurrentMonth}
                      onClick={() => {
                        setSelectedDate(isSelected ? null : day);
                        // Auto-retract on mobile after selection to free screen space immediately!
                        setCalendarOpen(false);
                      }}
                      className={[
                        'aspect-square flex flex-col items-center justify-center relative text-[11px] font-mono h-7 sm:h-8',
                        isCurrentMonth
                          ? isSelected
                            ? 'border-2 border-black dark:border-[#4169E1] bg-yellow-400 text-black font-bold'
                            : isTodayDate
                              ? 'border-2 border-black dark:border-[#4169E1] bg-orange-500 text-white font-bold'
                              : 'border-2 border-black dark:border-[#4169E1] bg-white dark:bg-black text-black dark:text-white'
                          : 'border border-dashed border-stone-300 dark:border-zinc-800 text-stone-300 dark:text-zinc-700 bg-stone-100/40 dark:bg-zinc-900/30 cursor-default select-none',
                      ].join(' ')}
                    >
                      {format(day, 'd')}
                      {hasTasks && isCurrentMonth && (
                        <div className={`absolute bottom-0.5 w-1 h-1 ${isSelected || isTodayDate ? 'bg-white' : 'bg-orange-500'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDate && (
              <div className="px-3 py-1.5 border-t border-black/10 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-[10px] text-stone-600 dark:text-zinc-400 truncate">
                  Filtered: <strong>{format(selectedDate, 'PPP')}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => { setSelectedDate(null); setCalendarOpen(false); }}
                  className="text-xs font-bold text-red-600 underline shrink-0 ml-2"
                >
                  Clear
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.aside>
  );
}
