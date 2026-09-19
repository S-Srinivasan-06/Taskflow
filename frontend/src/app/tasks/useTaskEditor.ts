import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '../api/http';
import { taskApi } from '../api/taskApi';
import type { Task, TaskCreateRequest, TaskUpdateRequest } from './types';

export const toastStyle = {
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

export function useTaskEditor(rememberCategory: (category: string | null | undefined) => void) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const saving = useRef(false);
  const toggling = useRef(new Set<string>());

  function close() {
    setIsOpen(false);
    setTask(null);
  }

  function open(task: Task | null = null) {
    setTask(task);
    setIsOpen(true);
  }

  function finishMutation(message: string, deleted = false) {
    for (const key of ['tasks', 'stats', 'calendar']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
    close();
    const style = deleted
      ? { ...toastStyle, background: '#dc2626', color: '#fff', border: '2px solid #991b1b' }
      : toastStyle;
    toast.success(message, { style });
  }

  async function reportError(error: unknown, fallback: string, existingTask: boolean) {
    if (existingTask) {
      await queryClient.invalidateQueries();
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) {
        close();
        toast.error('This task changed in another session. Reopen it to review the latest version.', { style: toastStyle });
        return;
      }
    }
    toast.error(error instanceof Error ? error.message : fallback, { style: toastStyle });
  }

  async function save(data: TaskCreateRequest | TaskUpdateRequest) {
    if (saving.current) return;
    saving.current = true;
    try {
      if (task) await taskApi.update(task.id, { ...data, version: task.version });
      else await taskApi.create(data);
      rememberCategory(data.category);
      finishMutation(task ? 'TASK UPDATED' : 'TASK CREATED');
    } catch (error) {
      await reportError(error, task ? 'Update failed' : 'Creation failed', !!task);
    } finally {
      saving.current = false;
    }
  }

  async function remove(id: string) {
    if (!task) return;
    try {
      await taskApi.delete(id, task.version);
      finishMutation('TASK DELETED', true);
    } catch (error) {
      await reportError(error, 'Delete failed', true);
    }
  }

  async function toggleStatus(task: Task) {
    if (toggling.current.has(task.id)) return;
    toggling.current.add(task.id);
    try {
      const status = task.status === 'DONE' || task.status === 'CANCELLED' ? 'PENDING' : 'DONE';
      await taskApi.status(task.id, status, task.version);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Status update failed', { style: toastStyle });
    } finally {
      toggling.current.delete(task.id);
      await queryClient.invalidateQueries();
    }
  }

  return { isOpen, task, open, close, save, remove, toggleStatus };
}
