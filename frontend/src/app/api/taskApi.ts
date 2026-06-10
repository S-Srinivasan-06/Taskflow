import { Task, TaskCreateRequest, TaskUpdateRequest } from '../components/types';

const API_BASE = 'http://localhost:8081/api/v1/tasks';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export interface TaskStats {
  totalActive: number;
  overdue: number;
  dueToday: number;
  completedToday: number;
  dueTomorrow: number;
  dueThisWeek: number;
}

export const taskApi = {
  async searchTasks(params: { search?: string, category?: string, quickFilter?: string, date?: string, startDate?: string, endDate?: string, sort?: string, page?: number, size?: number }): Promise<PageResponse<Task>> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category) query.append('category', params.category);
    if (params.quickFilter) query.append('quickFilter', params.quickFilter);
    if (params.date) query.append('date', params.date);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.sort) query.append('sort', params.sort);
    if (params.page !== undefined) query.append('page', params.page.toString());
    if (params.size !== undefined) query.append('size', params.size.toString());
    
    const res = await fetch(`${API_BASE}/search?${query.toString()}`);
    return handleResponse<PageResponse<Task>>(res);
  },

  async getStats(): Promise<TaskStats> {
    const res = await fetch(`${API_BASE}/stats`);
    return handleResponse<TaskStats>(res);
  },

  async getAll(page = 0, size = 10): Promise<PageResponse<Task>> {
    const res = await fetch(`${API_BASE}?page=${page}&size=${size}`);
    return handleResponse<PageResponse<Task>>(res);
  },

  async getById(id: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/${id}`);
    return handleResponse<Task>(res);
  },

  async getUpNext(page = 0, size = 10): Promise<PageResponse<Task>> {
    const res = await fetch(`${API_BASE}/up-next?page=${page}&size=${size}`);
    return handleResponse<PageResponse<Task>>(res);
  },

  async getByMonth(year: number, month: number): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/calendar?year=${year}&month=${month}`);
    return handleResponse<Task[]>(res);
  },

  async create(data: TaskCreateRequest): Promise<Task> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Task>(res);
  },

  async update(id: string, data: TaskUpdateRequest): Promise<Task> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Task>(res);
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(error.message || `Delete failed: ${res.status}`);
    }
  },
};
