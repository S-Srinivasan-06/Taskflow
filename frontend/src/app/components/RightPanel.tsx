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
  onToggleStatus: (id: string) => void;
  onNewTask: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
}

export function RightPanel({
  selectedDate, activeCategory, searchQuery, setSearchQuery,
  quickFilter, setQuickFilter, onEditTask, onToggleStatus, onNewTask, searchRef,
}: Props) {

  const isBidirectional = !selectedDate && !searchQuery;
  const todayStr = startOfDay(new Date()).toISOString();

  // Query 1: Future tasks (or standard unified query if not bidirectional)
  const {
    data: futureData,
    fetchNextPage: fetchNextFuture,
    hasNextPage: hasNextFuture,
    isFetchingNextPage: isFetchingNextFuture,
    status: futureStatus
  } = useInfiniteQuery({
    queryKey: ['tasks', 'future', activeCategory, searchQuery, quickFilter, selectedDate?.toISOString()],
    queryFn: ({ pageParam = 0 }) => taskApi.searchTasks({
      page: pageParam,
      size: 10,
      search: searchQuery || undefined,
      category: activeCategory === 'ALL' ? undefined : activeCategory,
      quickFilter: quickFilter === 'ALL' ? undefined : quickFilter,
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
      startDate: isBidirectional ? todayStr : undefined,
      sort: 'dueAt,asc',
    }),
    getNextPageParam: (lastPage) => lastPage.number + 1 < lastPage.totalPages ? lastPage.number + 1 : undefined,
    initialPageParam: 0,
  });

  // Query 2: Past tasks (only active if bidirectional)
  const {
    data: pastData,
    fetchNextPage: fetchNextPast,
    hasNextPage: hasNextPast,
    isFetchingNextPage: isFetchingNextPast,
    status: pastStatus
  } = useInfiniteQuery({
    queryKey: ['tasks', 'past', activeCategory, quickFilter],
    queryFn: ({ pageParam = 0 }) => taskApi.searchTasks({
      page: pageParam,
      size: 10,
      category: activeCategory === 'ALL' ? undefined : activeCategory,
      quickFilter: quickFilter === 'ALL' ? undefined : quickFilter,
      endDate: todayStr,
      sort: 'dueAt,desc',
    }),
    getNextPageParam: (lastPage) => lastPage.number + 1 < lastPage.totalPages ? lastPage.number + 1 : undefined,
    initialPageParam: 0,
    enabled: isBidirectional,
  });

  const futureRef = useRef<HTMLDivElement>(null);
  const pastRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);

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

  // Preserve scroll position when past tasks are prepended
  const [previousScrollHeight, setPreviousScrollHeight] = useState(0);

  useLayoutEffect(() => {
    if (isBidirectional && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      
      if (!hasAutoScrolled.current && futureTasks.length > 0) {
        const todayMarker = document.getElementById('today-marker');
        if (todayMarker) {
          container.scrollTop = todayMarker.offsetTop - 150; // Offset for header padding
          hasAutoScrolled.current = true;
        }
      } else if (pastTasks.length > 0 && container.scrollHeight > previousScrollHeight && hasAutoScrolled.current) {
         // Maintain position when loading past tasks
         container.scrollTop += container.scrollHeight - previousScrollHeight;
      }
      setPreviousScrollHeight(container.scrollHeight);
    }
  }, [pastTasks.length, futureTasks.length, isBidirectional]);

  // Reset auto scroll on filter change
  useEffect(() => {
    hasAutoScrolled.current = false;
    setPreviousScrollHeight(0);
  }, [activeCategory, quickFilter, selectedDate, searchQuery]);

  const quickFilters = ['REMAINING', 'ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW', 'COMPLETED', 'OVERDUE'];

  if (futureStatus === 'pending' || (isBidirectional && pastStatus === 'pending')) {
    return (
      <main className="flex-1 p-6 overflow-y-auto bg-stone-100">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-stone-200 border-2 border-black animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex-1 flex flex-col bg-stone-100 overflow-hidden relative"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {/* Toolbar */}
      <div className="sticky top-0 z-20 p-4 border-b-2 border-black bg-white shrink-0 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" strokeWidth={3} />
            <input
              ref={searchRef as any}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="SEARCH TASKS..."
              className="w-full pl-9 pr-4 py-2 border-2 border-black bg-stone-50 text-xs uppercase focus:outline-none focus:bg-white shadow-brutal-sm"
            />
            {searchQuery && (
              <button
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
                'px-3 py-1 border-2 border-black text-[10px] font-bold uppercase transition-all',
                quickFilter === f
                  ? 'bg-black text-white shadow-none'
                  : 'bg-white shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover',
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
              className="text-stone-200 leading-none tracking-tighter font-bold text-center"
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
                onToggle={e => { e.stopPropagation(); onToggleStatus(task.id); }}
              />
            ))}

            {isBidirectional && <div id="today-marker" className="h-0" />}

            {futureTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                group="TODAY/FUTURE"
                onEdit={() => onEditTask(task)}
                onToggle={e => { e.stopPropagation(); onToggleStatus(task.id); }}
              />
            ))}

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
