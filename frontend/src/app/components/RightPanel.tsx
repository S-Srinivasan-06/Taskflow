import { useState, useEffect, useRef, RefObject, useLayoutEffect } from 'react';
import { Search } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { format, startOfDay } from 'date-fns';
import { taskApi } from '../api/taskApi';
import { Task } from './types';
import { TaskCard } from './TaskCard';

interface Props {
  selectedDate: Date | null;
  activeCategory: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  quickFilter: string;
  setQuickFilter: (q: string) => void;
  onEditTask: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  onNewTask: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

export function RightPanel({
  selectedDate, activeCategory, searchQuery, setSearchQuery,
  quickFilter, setQuickFilter, onEditTask, onToggleStatus, onNewTask, searchRef,
}: Props) {

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery.trim());
  const [browserDay, setBrowserDay] = useState(() => startOfDay(new Date()).getTime());

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    const checkBrowserDay = () => {
      const nextDay = startOfDay(new Date()).getTime();
      setBrowserDay(previousDay => previousDay === nextDay ? previousDay : nextDay);
    };
    const interval = window.setInterval(checkBrowserDay, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const isBidirectional = !selectedDate && !debouncedSearchQuery;
  const todayStr = new Date(browserDay).toISOString();

  // Query 1: Future tasks (or standard unified query if not bidirectional)
  const {
    data: futureData,
    fetchNextPage: fetchNextFuture,
    hasNextPage: hasNextFuture,
    isFetchingNextPage: isFetchingNextFuture,
    status: futureStatus,
    isError: isFutureError,
    refetch: refetchFuture,
  } = useInfiniteQuery({
    queryKey: ['tasks', 'future', browserDay, activeCategory, debouncedSearchQuery, quickFilter, selectedDate?.toISOString()],
    queryFn: ({ pageParam = 0, signal }) => taskApi.searchTasks({
      page: pageParam,
      size: 10,
      search: debouncedSearchQuery || undefined,
      category: activeCategory === 'ALL' ? undefined : activeCategory,
      quickFilter: quickFilter === 'ALL' ? undefined : quickFilter,
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
      startDate: isBidirectional ? todayStr : undefined,
      includeUndated: isBidirectional,
      sort: 'dueAt,asc',
    }, signal),
    getNextPageParam: (lastPage) => lastPage.number + 1 < lastPage.totalPages ? lastPage.number + 1 : undefined,
    initialPageParam: 0,
  });

  // Query 2: Past tasks (only active if bidirectional)
  const {
    data: pastData,
    fetchNextPage: fetchNextPast,
    hasNextPage: hasNextPast,
    isFetchingNextPage: isFetchingNextPast,
    status: pastStatus,
    isError: isPastError,
    refetch: refetchPast,
  } = useInfiniteQuery({
    queryKey: ['tasks', 'past', browserDay, activeCategory, quickFilter],
    queryFn: ({ pageParam = 0, signal }) => taskApi.searchTasks({
      page: pageParam,
      size: 10,
      category: activeCategory === 'ALL' ? undefined : activeCategory,
      quickFilter: quickFilter === 'ALL' ? undefined : quickFilter,
      endDate: todayStr,
      sort: 'dueAt,desc',
    }, signal),
    getNextPageParam: (lastPage) => lastPage.number + 1 < lastPage.totalPages ? lastPage.number + 1 : undefined,
    initialPageParam: 0,
    enabled: isBidirectional,
  });

  const futureRef = useRef<HTMLDivElement>(null);
  const pastRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);
  const previousScrollHeight = useRef(0);
  const previousPastTaskCount = useRef(0);

  useEffect(() => {
    if (!hasNextFuture || isFetchingNextFuture) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) fetchNextFuture();
    }, { threshold: 1.0 });
    if (futureRef.current) observer.observe(futureRef.current);
    return () => observer.disconnect();
  }, [fetchNextFuture, hasNextFuture, isFetchingNextFuture]);

  useEffect(() => {
    if (!hasNextPast || isFetchingNextPast || !isBidirectional) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) fetchNextPast();
    }, { threshold: 1.0 });
    if (pastRef.current) observer.observe(pastRef.current);
    return () => observer.disconnect();
  }, [fetchNextPast, hasNextPast, isFetchingNextPast, isBidirectional]);

  const pastTasks = isBidirectional ? [...(pastData?.pages.flatMap(p => p.content) || [])].reverse() : [];
  const futureTasks = futureData?.pages.flatMap(p => p.content) || [];
  
  const totalCount = (isBidirectional ? pastData?.pages[0]?.totalElements || 0 : 0) + (futureData?.pages[0]?.totalElements || 0);

  useLayoutEffect(() => {
    if (isBidirectional && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const pastTaskCount = pastTasks.length;
      
      if (!hasAutoScrolled.current && futureTasks.length > 0) {
        const todayMarker = document.getElementById('today-marker');
        if (todayMarker) {
          container.scrollTop = todayMarker.offsetTop - 150; // Offset for header padding
          hasAutoScrolled.current = true;
        }
      } else if (
        pastTaskCount > previousPastTaskCount.current &&
        previousScrollHeight.current > 0 &&
        hasAutoScrolled.current
      ) {
        // Only compensate when older tasks were prepended; future-page appends
        // should leave the user's current viewport unchanged.
        container.scrollTop += container.scrollHeight - previousScrollHeight.current;
      }
      previousScrollHeight.current = container.scrollHeight;
      previousPastTaskCount.current = pastTaskCount;
    }
  }, [pastTasks.length, futureTasks.length, isBidirectional]);

  // Reset auto scroll on filter change
  useEffect(() => {
    hasAutoScrolled.current = false;
    previousScrollHeight.current = 0;
    previousPastTaskCount.current = 0;
  }, [activeCategory, quickFilter, selectedDate, debouncedSearchQuery, browserDay]);

  const retryQueries = () => {
    if (isFutureError) void refetchFuture();
    if (isBidirectional && isPastError) void refetchPast();
  };

  const quickFilters = ['REMAINING', 'ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW', 'COMPLETED', 'OVERDUE'];

  if (isFutureError || (isBidirectional && isPastError)) {
    return (
      <main className='flex-1 p-6 overflow-y-auto bg-stone-100 dark:bg-black'>
        <div className='flex h-full flex-col items-center justify-center gap-4 text-center'>
          <div className='text-2xl font-bold'>COULD NOT LOAD TASKS.</div>
          <p className='text-sm text-stone-500'>Check your connection and try again.</p>
          <button
            type='button'
            onClick={retryQueries}
            className='border-2 border-black dark:border-[#4169E1] bg-white dark:bg-black px-4 py-2 text-xs font-bold uppercase shadow-brutal-sm dark:shadow-[#ffffff] hover:-translate-x-0.5 hover:-translate-y-0.5'
          >
            RETRY
          </button>
        </div>
      </main>
    );
  }

  if (futureStatus === 'pending' || (isBidirectional && pastStatus === 'pending')) {
    return (
      <main className="flex-1 p-6 overflow-y-auto bg-stone-100 dark:bg-black">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-stone-200 dark:bg-[#333333] border-2 border-black dark:border-[#4169E1] animate-pulse" />
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
      <div className="sticky top-0 z-20 p-4 border-b-2 border-black dark:border-[#4169E1] bg-white dark:bg-black shrink-0 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" strokeWidth={3} />
            <input
              ref={searchRef as any}
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

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          {quickFilters.map(f => (
            <button
              key={f}
              onClick={() => setQuickFilter(f)}
              className={[
                'px-3 py-1 border-2 border-black dark:border-[#4169E1] text-[10px] font-bold uppercase transition-all',
                quickFilter === f
                  ? 'bg-black dark:bg-[#4169E1] text-white shadow-none'
                  : 'bg-white dark:bg-black shadow-brutal-sm dark:shadow-[#ffffff] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover dark:hover:shadow-[4px_4px_0px_0px_#ffffff]',
              ].join(' ')}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
          {totalCount > 0 && (
            <span className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase self-center">
              {totalCount} task{totalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Task List */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {(pastTasks.length === 0 && futureTasks.length === 0) ? (
          <div className="flex flex-col items-center justify-center h-full select-none">
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
    </main>
  );
}
