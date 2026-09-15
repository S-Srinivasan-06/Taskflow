import { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Topbar } from './components/Topbar';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { TaskModal } from './components/TaskModal';
import { Task, CustomCategory, TaskCreateRequest, TaskUpdateRequest } from './components/types';
import { taskApi } from './api/taskApi';
import { User, ApiError, hasStaleReads } from './api/http';
import { AnimatePresence } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { isLocalCacheEnabled, loadLocalPreferences, saveLocalPreferences, setLocalCacheEnabled } from './cache/localCache';

import { LocalPreferences, validPreferences } from './cache/preferences';

export default function App({ user, onLogout }: { user: User; onLogout: () => void; notice: string }) {
  const [saved] = useState(() => loadLocalPreferences(user.id, validPreferences));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stale, setStale] = useState(hasStaleReads);
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [quickFilter, setQuickFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [timezone, setTimezone] = useState(saved?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(saved?.categories || [
    { name: 'work', color: 'bg-blue-500' }, { name: 'personal', color: 'bg-purple-500' }, { name: 'health', color: 'bg-emerald-500' },
  ]);
  const [localCache, setLocalCache] = useState(() => isLocalCacheEnabled(user.id));
  const saving = useRef(false);
  const toggling = useRef(new Set<string>());
  useEffect(() => {
    const changed = () => setStale(hasStaleReads());
    const storageError = () => {
      setLocalCache(false);
      toast.error('Browser data could not be cleared. Clear this site in browser storage settings.');
    };
    const storageChanged = () => setLocalCache(isLocalCacheEnabled(user.id));
    window.addEventListener('taskflow:cache-status', changed);
    window.addEventListener('taskflow:storage-error', storageError);
    window.addEventListener('storage', storageChanged);
    return () => {
      window.removeEventListener('taskflow:cache-status', changed);
      window.removeEventListener('taskflow:storage-error', storageError);
      window.removeEventListener('storage', storageChanged);
    };
  }, [user.id]);
  function rememberCategory(category: string | null | undefined) {
    const name = category?.trim().toLowerCase();
    if (name && name !== 'all') setCustomCategories(previous => previous.some(c => c.name === name) || previous.length >= 100
      ? previous : [...previous, { name, color: 'bg-blue-500' }]);
  }
  function resolveConflict(error: unknown) {
    if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
      setIsModalOpen(false); setEditingTask(null);
      toast.error('This task changed in another session. Reopen it to review the latest version.', { style: toastStyle });
      return true;
    }
    return false;
  }

  useEffect(() => {
    if (localCache) saveLocalPreferences(user.id, { timezone, categories: customCategories } satisfies LocalPreferences);
  }, [localCache, timezone, customCategories, user.id]);

  async function toggleLocalCache(enabled: boolean) {
    try {
    const available = await setLocalCacheEnabled(user.id, enabled);
    if (!available) {
      toast.error('Browser storage is unavailable', { style: toastStyle });
      return;
    }
    setLocalCache(enabled);
    if (enabled) {
      saveLocalPreferences(user.id, { timezone, categories: customCategories } satisfies LocalPreferences);
      toast.success('LOCAL CACHE ENABLED', { style: toastStyle });
    } else toast.success('LOCAL DATA CLEARED', { style: toastStyle });
    } catch {
      setLocalCache(isLocalCacheEnabled(user.id));
      toast.error('Could not clear saved data. Clear this site in browser storage settings.', { style: toastStyle });
    }
  }

  // Initial fetch + keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.defaultPrevented || target.closest('[role="dialog"]')) return;
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
      rememberCategory(data.category);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setIsModalOpen(false);
      setEditingTask(null);
      toast.success('TASK CREATED', { style: toastStyle });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Creation failed', { style: toastStyle });
    }
  };

  const handleUpdateTask = async (data: TaskUpdateRequest) => {
    if (!editingTask) return;
    try {
      await taskApi.update(editingTask.id, { ...data, version: editingTask.version });
      rememberCategory(data.category);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setIsModalOpen(false);
      setEditingTask(null);
      toast.success('TASK UPDATED', { style: toastStyle });
    } catch (e) {
      await queryClient.invalidateQueries();
      if (resolveConflict(e)) return;
      toast.error(e instanceof Error ? e.message : 'Update failed', { style: toastStyle });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      if (!editingTask) return;
      await taskApi.delete(id, editingTask.version);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      setIsModalOpen(false);
      setEditingTask(null);
      toast.success('TASK DELETED', { style: { ...toastStyle, background: '#dc2626', color: '#fff', border: '2px solid #991b1b' } });
    } catch (e) {
      await queryClient.invalidateQueries();
      if (resolveConflict(e)) return;
      toast.error(e instanceof Error ? e.message : 'Delete failed', { style: toastStyle });
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const id = task.id;
    if (toggling.current.has(id)) return;
    toggling.current.add(id);
    try {
      const status = task.status === 'DONE' || task.status === 'CANCELLED' ? 'PENDING' : 'DONE';
      await taskApi.status(id, status, task.version);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Status update failed', {style: toastStyle}); }
    finally { toggling.current.delete(id); await queryClient.invalidateQueries(); }
  };

  const openNewTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  return (
    <div className="h-dvh flex flex-col bg-stone-100 dark:bg-[#121316] text-black dark:text-[#f5f5f4] overflow-hidden">
      <Topbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(open => !open)}
        onNewTask={openNewTask}
        timezone={timezone}
        setTimezone={setTimezone}
        username={user.username}
        localCache={localCache}
        onLocalCacheChange={enabled => void toggleLocalCache(enabled)}
        onLogout={onLogout}
      />

      {stale && <div role="status" className="px-4 py-2 text-sm bg-amber-100 dark:bg-zinc-800 border-b-2 border-amber-600">
        Showing saved data. It may be out of date.
        <button onClick={() => void queryClient.invalidateQueries()} className="ml-3 underline font-bold">Reconnect</button>
      </div>}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        <div id="taskflow-sidebar" className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex shrink-0 max-h-[45dvh] md:max-h-full overflow-hidden`}>
        <LeftPanel
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          selectedDate={selectedDate}
          setSelectedDate={date => { setSelectedDate(date); setSidebarOpen(false); }}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          customCategories={customCategories}
          setCustomCategories={setCustomCategories}
          setQuickFilter={filter => { setQuickFilter(filter); setSelectedDate(null); setSidebarOpen(false); }}
        />
        </div>

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

      <AnimatePresence>
      {isModalOpen && (
        <TaskModal
          task={editingTask}
          categories={customCategories}
          onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
          onSave={async (data) => {
            if (saving.current) return;
            saving.current = true;
            try { await (editingTask ? handleUpdateTask(data as TaskUpdateRequest) : handleCreateTask(data as TaskCreateRequest)); }
            finally { saving.current = false; }
          }}
          onDelete={handleDeleteTask}
        />
      )}

      </AnimatePresence>
      <Toaster position="bottom-right" />
    </div>
  );
}
