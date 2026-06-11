import { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Topbar } from './components/Topbar';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { TaskModal } from './components/TaskModal';
import { Task, CustomCategory, TaskCreateRequest, TaskUpdateRequest } from './components/types';
import { taskApi } from './api/taskApi';
import { useQueryClient } from '@tanstack/react-query';

export default function App() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [quickFilter, setQuickFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Timezone — persisted to localStorage
  const [timezone, setTimezone] = useState(() =>
    localStorage.getItem('taskflow_tz') || Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  // Custom categories — persisted to localStorage
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(() => {
    const saved = localStorage.getItem('taskflow_categories');
    return saved ? JSON.parse(saved) : [
      { name: 'work', color: 'bg-blue-500' },
      { name: 'personal', color: 'bg-purple-500' },
      { name: 'health', color: 'bg-emerald-500' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('taskflow_tz', timezone);
  }, [timezone]);

  useEffect(() => {
    localStorage.setItem('taskflow_categories', JSON.stringify(customCategories));
  }, [customCategories]);

  // Initial fetch + keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      if (e.key === 'Escape') {
        if (isModalOpen) {
          setIsModalOpen(false);
          setEditingTask(null);
        } else if (selectedDate) {
          setSelectedDate(null);
        }
        return;
      }

      if (isInput) return;

      if (e.key === 'n' || e.key === 'N' || e.key === 'c' || e.key === 'C') {
        setEditingTask(null);
        setIsModalOpen(true);
      } else if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, selectedDate]);

  const toastStyle = {
    background: '#fff',
    border: '2px solid #000',
    boxShadow: '4px 4px 0px #000',
    borderRadius: '0',
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    fontSize: '12px',
  };

  const handleCreateTask = async (data: TaskCreateRequest) => {
    try {
      await taskApi.create(data);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setIsModalOpen(false);
      setEditingTask(null);
      toast.success('TASK CREATED', { style: toastStyle });
    } catch {
      toast.error('CREATION FAILED', { style: toastStyle });
    }
  };

  const handleUpdateTask = async (data: TaskUpdateRequest) => {
    if (!editingTask) return;
    try {
      await taskApi.update(editingTask.id, data);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setIsModalOpen(false);
      setEditingTask(null);
      toast.success('TASK UPDATED', { style: toastStyle });
    } catch {
      toast.error('UPDATE FAILED', { style: toastStyle });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await taskApi.delete(id);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setIsModalOpen(false);
      setEditingTask(null);
      toast.success('TASK DELETED', { style: { ...toastStyle, background: '#dc2626', color: '#fff', border: '2px solid #991b1b' } });
    } catch {
      toast.error('DELETE FAILED', { style: toastStyle });
    }
  };

  const handleToggleStatus = async (id: string) => {
    // We cannot easily do an optimistic update without having the full task details,
    // so we'll just fetch it, modify it, and invalidate.
    try {
      const task = await taskApi.getById(id);
      const newStatus = (task.status === 'DONE' || task.status === 'CANCELLED') ? 'PENDING' : 'DONE';
      await taskApi.update(id, {
        title: task.title,
        description: task.description,
        dueAt: task.dueAt,
        category: task.category,
        priority: task.priority,
        status: newStatus,
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    } catch {
      toast.error('STATUS UPDATE FAILED', { style: toastStyle });
    }
  };

  const openNewTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-stone-100 dark:bg-black text-black dark:text-[#f5f5f4] overflow-hidden">
      <Topbar
        onNewTask={openNewTask}
        timezone={timezone}
        setTimezone={setTimezone}
      />

      <div className="flex-1 flex overflow-hidden">
        <LeftPanel
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          customCategories={customCategories}
          setCustomCategories={setCustomCategories}
          setQuickFilter={setQuickFilter}
        />

        <RightPanel
          selectedDate={selectedDate}
          activeCategory={activeCategory}
          quickFilter={quickFilter}
          setQuickFilter={setQuickFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onEditTask={(task) => { setEditingTask(task); setIsModalOpen(true); }}
          onToggleStatus={handleToggleStatus}
          onNewTask={openNewTask}
          searchRef={searchRef}
        />
      </div>

      {isModalOpen && (
        <TaskModal
          task={editingTask}
          categories={customCategories}
          onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
          onSave={(data) => editingTask ? handleUpdateTask(data as TaskUpdateRequest) : handleCreateTask(data as TaskCreateRequest)}
          onDelete={handleDeleteTask}
        />
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}
