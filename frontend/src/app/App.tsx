import { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Topbar } from './components/Topbar';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { TaskModal } from './components/TaskModal';
import type { CustomCategory } from './tasks/types';
import { useTaskEditor, toastStyle } from './tasks/useTaskEditor';
import { User, hasStaleReads } from './api/http';
import { AnimatePresence } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { isLocalCacheEnabled, loadLocalPreferences, saveLocalPreferences, setLocalCacheEnabled } from './cache/localCache';

import { LocalPreferences, validPreferences } from './cache/preferences';

export default function App({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [saved] = useState(() => loadLocalPreferences(user.id, validPreferences));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stale, setStale] = useState(hasStaleReads);
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [quickFilter, setQuickFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const [timezone, setTimezone] = useState(saved?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(saved?.categories || [
    { name: 'work', color: 'bg-blue-500' }, { name: 'personal', color: 'bg-purple-500' }, { name: 'health', color: 'bg-emerald-500' },
  ]);
  const [localCache, setLocalCache] = useState(() => isLocalCacheEnabled(user.id));
  const editor = useTaskEditor(rememberCategory);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.defaultPrevented || target.closest('[role="dialog"]')) return;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      if (e.key === 'Escape') {
        if (editor.isOpen) {
          editor.close();
        } else if (selectedDate) {
          setSelectedDate(null);
        }
        return;
      }

      if (isInput) return;

      if (e.key === 'n' || e.key === 'N' || e.key === 'c' || e.key === 'C') {
        editor.open();
      } else if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor.isOpen, selectedDate]);

  return (
    <div className="h-dvh flex flex-col bg-stone-100 dark:bg-[#121316] text-black dark:text-[#f5f5f4] overflow-hidden">
      <Topbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(open => !open)}
        onNewTask={() => editor.open()}
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
      <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col overflow-hidden md:flex-row 2xl:border-x-2 2xl:border-black 2xl:dark:border-zinc-700">
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
          onEditTask={editor.open}
          onToggleStatus={editor.toggleStatus}
          searchRef={searchRef}
        />
      </div>

      <AnimatePresence>
      {editor.isOpen && (
        <TaskModal
          task={editor.task}
          categories={customCategories}
          onClose={editor.close}
          onSave={editor.save}
          onDelete={editor.remove}
        />
      )}

      </AnimatePresence>
      <Toaster position="bottom-right" />
    </div>
  );
}
