import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
  isSameMonth, isSameDay, format, addMonths, subMonths, setMonth,
} from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { taskApi } from '../api/taskApi';
import { Task, CustomCategory } from './types';

interface Props {
  calendarMonth: Date;
  setCalendarMonth: (d: Date) => void;
  selectedDate: Date | null;
  setSelectedDate: (d: Date | null) => void;
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  customCategories: CustomCategory[];
  setCustomCategories: (c: CustomCategory[]) => void;
  setQuickFilter: (f: string) => void;
}

const COLORS = ['bg-blue-500', 'bg-yellow-400', 'bg-orange-500', 'bg-red-600', 'bg-purple-500', 'bg-emerald-500', 'bg-pink-500'];

export function LeftPanel({
  calendarMonth, setCalendarMonth, selectedDate, setSelectedDate,
  activeCategory, setActiveCategory, customCategories, setCustomCategories,
  setQuickFilter,
}: Props) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('bg-blue-500');

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

  const { data: monthTasks } = useQuery({
    queryKey: ['calendar', calendarMonth.getFullYear(), calendarMonth.getMonth() + 1],
    queryFn: () => taskApi.getByMonth(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1)
  });
  
  const activeTasks = monthTasks || [];

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: taskApi.getStats,
    refetchInterval: 10000, // keep stats somewhat fresh
  });

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const name = newCatName.trim().toLowerCase();
    if (!customCategories.find(c => c.name === name)) {
      const updated = [...customCategories, { name, color: newCatColor }];
      setCustomCategories(updated);
      localStorage.setItem('taskflow_categories', JSON.stringify(updated));
    }
    setNewCatName('');
    setShowAddCategory(false);
  };

  const handleRemoveCategory = (name: string) => {
    const updated = customCategories.filter(c => c.name !== name);
    setCustomCategories(updated);
    localStorage.setItem('taskflow_categories', JSON.stringify(updated));
    if (activeCategory === name) setActiveCategory('ALL');
  };

  return (
    <aside
      className="w-80 border-r-2 border-black dark:border-[#4169E1] bg-stone-50 dark:bg-black flex flex-col shrink-0 overflow-y-auto"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
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
            const hasTasks = activeTasks.some(t => t.dueAt && isSameDay(new Date(t.dueAt), day) && t.status !== 'DONE' && t.status !== 'CANCELLED');

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

      {/* Stats Progress */}
      <div className="p-4 border-b-2 border-black dark:border-[#4169E1] space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2">PROGRESS</h3>
        {[
          { key: 'REMAINING', total: stats?.totalActive || 0 },
          { key: 'OVERDUE', total: stats?.overdue || 0 },
          { key: 'TODAY', total: (stats?.dueToday || 0) - (stats?.completedToday || 0) },
          { key: 'TOMORROW', total: stats?.dueTomorrow || 0 },
          { key: 'THIS WEEK', total: stats?.dueThisWeek || 0 },
        ].map((val) => (
            <button
              key={val.key}
              onClick={() => setQuickFilter(val.key)}
              className="w-full text-left cursor-pointer group flex justify-between items-center py-2 border-b-2 border-transparent hover:border-black dark:hover:border-[#4169E1] transition-colors"
            >
              <span className="text-xs font-bold uppercase group-hover:text-orange-600">{val.key}</span>
              <span className="text-[10px] font-bold text-stone-500 group-hover:text-orange-500 bg-stone-200 dark:bg-[#333333] px-2 py-0.5 border-2 border-transparent group-hover:border-black dark:group-hover:border-[#4169E1] group-hover:bg-white dark:group-hover:bg-black transition-colors">{val.total}</span>
            </button>
        ))}
      </div>

      {/* Categories */}
      <div className="p-4 flex-1">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-3">FILTER BY CATEGORY</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={[
              'px-3 py-1 border-2 border-black dark:border-[#4169E1] text-[10px] font-bold uppercase shadow-brutal-sm dark:shadow-[#ffffff] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover dark:hover:shadow-[4px_4px_0px_0px_#ffffff]',
              activeCategory === 'ALL' ? 'bg-black dark:bg-[#4169E1] text-white' : 'bg-white dark:bg-black',
            ].join(' ')}
          >
            ALL
          </button>
          {customCategories.map(cat => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={[
                'px-3 py-1 border-2 border-black dark:border-[#4169E1] text-[10px] font-bold uppercase shadow-brutal-sm dark:shadow-[#ffffff] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover dark:hover:shadow-[4px_4px_0px_0px_#ffffff] flex items-center gap-1.5 group/cat',
                activeCategory === cat.name ? 'bg-black dark:bg-[#4169E1] text-white' : 'bg-white dark:bg-black',
              ].join(' ')}
            >
              <div className={`w-2 h-2 ${cat.color} border border-black shrink-0`} />
              {cat.name}
              <span
                onClick={e => { e.stopPropagation(); handleRemoveCategory(cat.name); }}
                className="ml-1 text-[8px] opacity-0 group-hover/cat:opacity-100 transition-opacity hover:text-red-500"
              >
                ✕
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAddCategory(true)}
          className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-black dark:border-[#4169E1] text-xs font-bold uppercase hover:bg-stone-100 dark:hover:bg-[#333333] transition-colors"
        >
          <Plus size={14} strokeWidth={3} /> ADD CATEGORY
        </button>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="p-4 border-t-2 border-black dark:border-[#4169E1]">
        <div className="text-[10px] text-stone-400 tracking-widest mb-1">SHORTCUTS</div>
        <div className="space-y-0.5 text-[10px] text-stone-400">
          <div>[N] New task · [/] Search · [Esc] Close</div>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black border-2 border-black dark:border-[#4169E1] w-full max-w-sm p-6 shadow-brutal-hover dark:shadow-[#ffffff]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold uppercase">NEW CATEGORY</h2>
              <button onClick={() => setShowAddCategory(false)} className="hover:text-red-500 transition-colors">
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              placeholder="e.g. coding, fitness"
              className="w-full border-b-2 border-black dark:border-[#4169E1] bg-transparent py-2 text-sm mb-4 focus:outline-none focus:border-orange-500 dark:focus:border-orange-500"
              style={{ fontFamily: "'Inter', sans-serif" }}
              autoFocus
            />
            <div className="flex gap-2 mb-6">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewCatColor(c)}
                  className={[
                    `w-8 h-8 ${c} border-2 transition-all`,
                    newCatColor === c ? 'border-black dark:border-white shadow-brutal-sm scale-110' : 'border-transparent',
                  ].join(' ')}
                />
              ))}
            </div>
            <button
              onClick={handleAddCategory}
              className="w-full bg-black dark:bg-[#4169E1] text-white py-2 text-xs font-bold uppercase border-2 border-black dark:border-[#4169E1] shadow-brutal dark:shadow-[#ffffff] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-hover dark:hover:shadow-[4px_4px_0px_0px_#ffffff] transition-all"
            >
              SAVE CATEGORY
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
