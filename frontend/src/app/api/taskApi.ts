import { Task, TaskCreateRequest, TaskUpdateRequest, TaskStatus } from '../components/types';
import { request } from './http';
export interface PageResponse<T> { content: T[]; totalPages: number; totalElements: number; size: number; number: number }
export interface TaskStats { totalActive: number; overdue: number; dueToday: number; completedToday: number; dueTomorrow: number; dueThisWeek: number }
export const taskApi = {
  searchTasks(params: { search?: string; category?: string; quickFilter?: string; date?: string; startDate?: string; endDate?: string; includeUndated?: boolean; sort?: string; page?: number; size?: number }, signal?: AbortSignal) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key,value]) => { if (value !== undefined) query.set(key,String(value)); });
    return request<PageResponse<Task>>('/tasks/search?' + query.toString(), { signal });
  },
  getStats: () => request<TaskStats>('/tasks/stats'),
  getAll: (page = 0, size = 10) => request<PageResponse<Task>>('/tasks?page=' + page + '&size=' + size),
  getById: (id: string) => request<Task>('/tasks/' + id),
  getUpNext: (page = 0, size = 10) => request<PageResponse<Task>>('/tasks/up-next?page=' + page + '&size=' + size),
  getByMonth: (year: number, month: number) => request<{ date: string; remaining: number }[]>('/tasks/calendar?year=' + year + '&month=' + month),
  create: (data: TaskCreateRequest) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: TaskUpdateRequest) => request<Task>('/tasks/' + id, { method: 'PUT', body: JSON.stringify(data) }),
  status: (id: string, status: TaskStatus, version: number) => request<Task>('/tasks/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status, version }) }),
  delete: (id: string, version: number) => request<void>('/tasks/' + id + '?version=' + version, { method: 'DELETE' }),
};
