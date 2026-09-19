import type { RefObject } from 'react';
import { Search } from 'lucide-react';
import type { Task } from '../tasks/types';
import { TaskCard } from './TaskCard';
import { useTaskFeed } from '../tasks/useTaskFeed';

interface Props {
  selectedDate: Date | null;
  activeCategory: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  quickFilter: string;
  setQuickFilter: (q: string) => void;
  onEditTask: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  searchRef: RefObject<HTMLInputElement>;
}

export function RightPanel({
  selectedDate, activeCategory, searchQuery, setSearchQuery,
  quickFilter, setQuickFilter, onEditTask, onToggleStatus, searchRef,
}: Props) {

  const {
    pastTasks, futureTasks, totalCount, isBidirectional,
    isFetchingNextPast, isFetchingNextFuture,
    futureRef, pastRef, scrollContainerRef,
    isError, isLoading, retryQueries,
  } = useTaskFeed({ selectedDate, activeCategory, searchQuery, quickFilter });

  const quickFilters = ['REMAINING', 'ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW', 'COMPLETED', 'OVERDUE'];

  if (isError) {
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

  if (isLoading) {
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
      <div className="sticky top-0 z-20 border-b-2 p-3 sm:p-4 lg:p-6 border-black dark:border-[#4169E1] bg-white dark:bg-black shrink-0 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
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

        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {quickFilters.map(f => (
            <button
              key={f}
              onClick={() => setQuickFilter(f)}
              className={[
                'shrink-0 px-3 py-1 border-2 border-black dark:border-[#4169E1] text-[10px] font-bold uppercase transition-all',
                quickFilter === f
                  ? 'bg-black dark:bg-[#4169E1] text-white shadow-none'
                  : 'bg-white dark:bg-black shadow-brutal-sm dark:shadow-[#ffffff] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover dark:hover:shadow-[4px_4px_0px_0px_#ffffff]',
              ].join(' ')}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
          {totalCount > 0 && (
            <span className="shrink-0 px-3 py-1 text-[10px] font-bold text-stone-400 uppercase self-center">
              {totalCount} task{totalCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Task List */}
      <div ref={scrollContainerRef} className="mx-auto w-full max-w-6xl flex-1 space-y-3 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:px-10">
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
