import { format, parseISO } from 'date-fns';
import { Check } from 'lucide-react';
import { Task } from './types';

type TaskGroup = 'OVERDUE' | 'TODAY' | 'TOMORROW' | 'THIS_WEEK' | 'LATER' | 'SOMEDAY';

interface Props {
  task: Task;
  group: TaskGroup;
  onEdit: () => void;
  onToggle: (e: React.MouseEvent) => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'bg-blue-500 text-white',
  MEDIUM: 'bg-yellow-400 text-black',
  HIGH: 'bg-orange-500 text-white',
  URGENT: 'bg-red-600 text-white',
};

const GROUP_ACCENT: Record<TaskGroup, string> = {
  OVERDUE: 'border-l-red-600',
  TODAY: 'border-l-orange-500',
  TOMORROW: 'border-l-amber-400',
  THIS_WEEK: 'border-l-emerald-500',
  LATER: 'border-l-stone-400',
  SOMEDAY: 'border-l-stone-300',
};

export function TaskCard({ task, group, onEdit, onToggle }: Props) {
  const isDone = task.status === 'DONE' || task.status === 'CANCELLED';

  let formattedDate: string | null = null;
  if (task.dueAt) {
    try {
      const d = parseISO(task.dueAt);
      formattedDate = d.getMinutes() === 0 && d.getHours() === 0
        ? format(d, 'MMM d')
        : format(d, 'MMM d · HH:mm');
    } catch {
      formattedDate = task.dueAt;
    }
  }

  return (
    <div
      onClick={onEdit}
      className={[
        'bg-white dark:bg-black border-2 border-black dark:border-[#4169E1] border-l-[6px]',
        GROUP_ACCENT[group],
        'shadow-brutal dark:shadow-[#ffffff] p-4 flex items-start gap-4 cursor-pointer',
        'hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-hover dark:hover:shadow-[4px_4px_0px_0px_#ffffff]',
        'transition-all duration-150',
        isDone ? 'opacity-50' : '',
      ].join(' ')}
    >
      <button
        onClick={onToggle}
        className={[
          'mt-0.5 w-6 h-6 border-2 border-black dark:border-[#4169E1] flex items-center justify-center shrink-0',
          'transition-colors shadow-brutal-sm dark:shadow-[#ffffff]',
          isDone ? 'bg-black dark:bg-[#4169E1] text-white' : 'bg-white dark:bg-black hover:bg-stone-100 dark:hover:bg-[#333333]',
        ].join(' ')}
        aria-label={isDone ? 'Mark pending' : 'Mark done'}
      >
        {isDone && <Check size={16} strokeWidth={4} />}
      </button>

      <div className="flex-1 min-w-0">
        <h3
          className={[
            'text-base font-bold leading-tight mb-1',
            isDone ? 'line-through text-stone-500' : 'text-black dark:text-[#f5f5f4]',
          ].join(' ')}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {task.title}
        </h3>
        <div className="flex flex-wrap items-center gap-3 font-mono">
          {formattedDate ? (
            <span className="text-[11px] text-stone-600 dark:text-stone-400 uppercase font-bold tracking-tight">
              {formattedDate}
            </span>
          ) : (
            <span className="text-[11px] text-stone-400 uppercase font-bold italic">
              NO DEADLINE
            </span>
          )}
          {task.category && (
            <span className="px-2 py-0.5 border-2 border-black dark:border-[#4169E1] bg-stone-100 dark:bg-[#1a1a1a] text-[9px] font-bold uppercase shadow-brutal-sm dark:shadow-[#ffffff]">
              {task.category}
            </span>
          )}
          {task.status === 'IN_PROGRESS' && (
            <span className="px-2 py-0.5 border-2 border-black dark:border-[#4169E1] bg-sky-100 dark:bg-[#0c4a6e] text-sky-700 dark:text-sky-200 text-[9px] font-bold uppercase shadow-brutal-sm dark:shadow-[#ffffff]">
              IN PROGRESS
            </span>
          )}
          {task.status === 'CANCELLED' && (
            <span className="px-2 py-0.5 border-2 border-black dark:border-[#4169E1] bg-stone-200 dark:bg-[#333333] text-stone-600 dark:text-stone-300 text-[9px] font-bold uppercase shadow-brutal-sm dark:shadow-[#ffffff]">
              CANCELLED
            </span>
          )}
        </div>
      </div>

      <div
        className={[
          'px-3 py-1 border-2 border-black dark:border-[#4169E1] font-mono text-[10px] font-bold uppercase shadow-brutal-sm dark:shadow-[#ffffff] shrink-0',
          PRIORITY_STYLES[task.priority] || 'bg-stone-200 dark:bg-[#333333] text-black dark:text-[#f5f5f4]',
        ].join(' ')}
      >
        {task.priority}
      </div>
    </div>
  );
}
