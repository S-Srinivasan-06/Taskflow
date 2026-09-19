import { type RefObject, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import type { Task, CustomCategory } from '../tasks/types';
import { TaskCard } from './TaskCard';
import { useTaskFeed } from '../tasks/useTaskFeed';
import { useQuery } from '@tanstack/react-query';
import { taskApi } from '../api/taskApi';
import { CATEGORY_COLORS } from '../cache/preferences';

interface Props {
  selectedDate: Date | null;
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  quickFilter: string;
  setQuickFilter: (q: string) => void;
  onEditTask: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  searchRef: RefObject<HTMLInputElement>;
  customCategories: CustomCategory[];
  setCustomCategories: (c: CustomCategory[]) => void;
}

const FILTER_STAT_MAP: Record<string, string> = {
  REMAINING: 'totalActive',
  OVERDUE: 'overdue',
  TODAY: 'dueToday',
  TOMORROW: 'dueTomorrow',
  'THIS WEEK': 'dueThisWeek',
};

export function RightPanel({
  selectedDate, activeCategory, setActiveCategory, searchQuery, setSearchQuery,
  quickFilter, setQuickFilter, onEditTask, onToggleStatus, searchRef,
  customCategories, setCustomCategories,
}: Props) {

  const {
    pastTasks, futureTasks, totalCount, isBidirectional,
    isFetchingNextPast, isFetchingNextFuture,
    futureRef, pastRef, scrollContainerRef,
    isError, isLoading, retryQueries,
  } = useTaskFeed({ selectedDate, activeCategory, searchQuery, quickFilter });

  const { data: stats, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['stats'],
    queryFn: taskApi.getStats,
    refetchInterval: 10000,
  });

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('bg-blue-500');

  const quickFilters = ['REMAINING', 'ALL', 'TODAY', 'TOMORROW', 'THIS WEEK', 'URGENT', 'HIGH', 'MEDIUM', 'LOW', 'COMPLETED', 'OVERDUE'];

  function getCount(filter: string): number | string | undefined {
    const statKey = FILTER_STAT_MAP[filter];
    if (!statKey) return undefined;
    if (statsError) return '—';
    if (!stats) return undefined;
    return stats[statKey as keyof typeof stats];
  }

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const name = newCatName.trim().toLowerCase();
    if (!customCategories.find(c => c.name === name)) {
      const updated = [...customCategories, { name, color: newCatColor }];
      setCustomCategories(updated);
    }
    setNewCatName('');
    setShowAddCategory(false);
  };

  const handleRemoveCategory = (name: string) => {
    const updated = customCategories.filter(c => c.name !== name);
    setCustomCategories(updated);
    if (activeCategory === name) setActiveCategory('ALL');
  };

  if (isError) {
    return (
      <main className='flex-1 p-6 overflow-y-auto bg-stone-100 dark:bg-black'>
        <div className='state-enter flex h-full flex-col items-center justify-center gap-4 text-center'>
          <div className='text-2xl font-bold'>COULD NOT LOAD TASKS.</div>
          <p className='text-sm text-stone-500'>Check your connection and try again.</p>
          <button
            type='button'
            onClick={retryQueries}
            className='motion-press border-2 border-black dark:border-[#4169E1] bg-white dark:bg-black px-4 py-2 text-xs font-bold uppercase shadow-brutal-sm dark:shadow-[#ffffff]'
          >
            RETRY
          </button>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto bg-stone-100 p-3 dark:bg-black sm:p-4 lg:p-6" aria-label="Loading task list">
        <div className="mx-auto max-w-6xl space-y-3" role="status" aria-live="polite">
          <span className="sr-only">Loading tasks</span>
          {[72, 54, 83, 62, 76].map((width, i) => (
            <div key={width} className="skeleton-card h-24 border-2 border-black bg-stone-200 p-4 dark:border-[#4169E1] dark:bg-[#333333]" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="skeleton-line h-3" style={{ width: `${width}%` }} />
              <div className="skeleton-line mt-4 h-2 w-2/5" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex-1 min-w-0 min-h-0 flex flex-col bg-stone-100 dark:bg-black overflow-hidden relative"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* Toolbar */}
      <div className="sticky top-0 z-20 border-b-2 p-2 sm:p-3 lg:p-4 border-black dark:border-[#4169E1] bg-white dark:bg-black shrink-0 shadow-sm space-y-2 sm:space-y-3">
        {/* Search Bar */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" strokeWidth={3} />
            <input
              ref={searchRef}
              type="text"
              aria-label="Search tasks"
              maxLength={255}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="SEARCH TASKS..."
              className="w-full pl-9 pr-4 py-2 border-2 border-black dark:border-[#4169E1] bg-stone-50 dark:bg-[#111111] text-xs uppercase focus:outline-none focus:bg-white dark:focus:bg-[#1a1a1a] shadow-brutal-sm dark:shadow-[#ffffff]"
            />
            {searchQuery && (
              <button
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-black text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Quick Filters with stat badges */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scroll-hide pb-0.5 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {quickFilters.map(f => {
            const count = getCount(f);
            return (
              <button
                key={f}
                onClick={() => setQuickFilter(f)}
                className={[
                  'shrink-0 px-2 sm:px-3 py-1 border-2 border-black dark:border-[#4169E1] text-[9px] sm:text-[10px] font-bold uppercase transition-all flex items-center gap-1',
                  quickFilter === f
                    ? 'bg-black dark:bg-[#4169E1] text-white shadow-none'
                    : 'bg-white dark:bg-black shadow-brutal-sm dark:shadow-[#ffffff] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover dark:hover:shadow-[4px_4px_0px_0px_#ffffff]',
                ].join(' ')}
              >
                {f.replace('_', ' ')}
                {count !== undefined && (
                  <span className={[
                    'text-[8px] sm:text-[9px] font-black px-1 py-px min-w-[1.1rem] text-center leading-tight',
                    quickFilter === f
                      ? 'bg-white/20 text-white'
                      : 'bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400',
                  ].join(' ')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          {statsError && <button type="button" onClick={() => void refetchStats()} className="shrink-0 text-[9px] sm:text-[10px] text-red-600 underline font-bold self-center px-1">RETRY</button>}
          {totalCount > 0 && (
            <span className="shrink-0 px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-bold text-stone-400 uppercase self-center">
              {totalCount} task{totalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scroll-hide pb-0.5 sm:flex-wrap sm:overflow-visible sm:pb-0 items-center">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={[
              'shrink-0 px-2 sm:px-3 py-1 border-2 border-black dark:border-[#4169E1] text-[9px] sm:text-[10px] font-bold uppercase shadow-brutal-sm dark:shadow-[#ffffff] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover dark:hover:shadow-[4px_4px_0px_0px_#ffffff]',
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
                'shrink-0 px-2 sm:px-3 py-1 border-2 border-black dark:border-[#4169E1] text-[9px] sm:text-[10px] font-bold uppercase shadow-brutal-sm dark:shadow-[#ffffff] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover dark:hover:shadow-[4px_4px_0px_0px_#ffffff] flex items-center gap-1 sm:gap-1.5 group/cat',
                activeCategory === cat.name ? 'bg-black dark:bg-[#4169E1] text-white' : 'bg-white dark:bg-black',
              ].join(' ')}
            >
              <div className={`w-2 h-2 ${cat.color} border border-black shrink-0`} />
              {cat.name}
              <span role="button" tabIndex={0} aria-label={`Remove ${cat.name} category`}
                onClick={e => { e.stopPropagation(); handleRemoveCategory(cat.name); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleRemoveCategory(cat.name); } }}
                className="ml-0.5 text-[8px] opacity-0 group-hover/cat:opacity-100 transition-opacity hover:text-red-500"
              >
                ✕
              </span>
            </button>
          ))}
          <button
            onClick={() => setShowAddCategory(true)}
            className="shrink-0 flex items-center gap-1 px-2 sm:px-3 py-1 border-2 border-dashed border-black dark:border-[#4169E1] text-[9px] sm:text-[10px] font-bold uppercase hover:bg-stone-100 dark:hover:bg-[#333333] transition-colors"
          >
            <Plus size={12} strokeWidth={3} />
            <span className="hidden sm:inline">ADD CATEGORY</span>
          </button>
        </div>
      </div>

      {/* Task List */}
      <div ref={scrollContainerRef} className="mx-auto w-full max-w-6xl flex-1 space-y-3 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:px-10">
        {(pastTasks.length === 0 && futureTasks.length === 0) ? (
          <div className="state-enter flex flex-col items-center justify-center h-full select-none">
            <div
              className="text-stone-200 dark:text-stone-800 leading-none tracking-tighter font-bold text-center"
              style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
            >
              NOTHING HERE.
            </div>
            <div className="text-stone-400 text-sm mt-4">
              Press [N] to create your first task.
            </div>
          </div>
        ) : (
          <>
            {/* Top intersection target for Past tasks */}
            {isBidirectional && (
              <div ref={pastRef} className="h-10 flex items-center justify-center">
                {isFetchingNextPast && <span className="text-xs font-bold text-stone-400">LOADING PREVIOUS...</span>}
              </div>
            )}
            
            {pastTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                group="PAST"
                onEdit={() => onEditTask(task)}
                onToggle={e => { e.stopPropagation(); onToggleStatus(task); }}
              />
            ))}

            {isBidirectional && <div id="today-marker" className="h-0" />}

            {futureTasks.filter(t => t.dueAt !== null).map(task => (
              <TaskCard
                key={task.id}
                task={task}
                group="TODAY/FUTURE"
                onEdit={() => onEditTask(task)}
                onToggle={e => { e.stopPropagation(); onToggleStatus(task); }}
              />
            ))}

            {(() => {
              const noDueDateTasks = futureTasks.filter(t => t.dueAt === null);
              if (noDueDateTasks.length === 0) return null;
              return (
                <>
                  <div className="flex items-center gap-2 pt-6 pb-2 border-t-2 border-dashed border-black dark:border-[#4169E1]">
                    <span className="text-[10px] font-bold bg-black dark:bg-[#4169E1] text-white px-2 py-0.5 uppercase">NO DUE DATE</span>
                    <span className="h-0.5 flex-1 bg-black dark:bg-[#4169E1]" />
                  </div>
                  {noDueDateTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      group="NO_DUE_DATE"
                      onEdit={() => onEditTask(task)}
                      onToggle={e => { e.stopPropagation(); onToggleStatus(task); }}
                    />
                  ))}
                </>
              );
            })()}

            {/* Bottom intersection target for Future tasks */}
            <div ref={futureRef} className="h-10 flex items-center justify-center">
              {isFetchingNextFuture && <span className="text-xs font-bold text-stone-400">LOADING MORE...</span>}
            </div>
          </>
        )}
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
              {CATEGORY_COLORS.map(c => (
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
    </main>
  );
}
