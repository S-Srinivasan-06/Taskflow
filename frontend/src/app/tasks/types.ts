export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  category: string | null;
  status: TaskStatus;
  priority: Priority;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface TaskCreateRequest {
  title: string;
  description?: string | null;
  dueAt?: string | null;
  category?: string | null;
  priority?: Priority;
}

export interface TaskUpdateRequest extends TaskCreateRequest {
  status?: TaskStatus;
  version?: number;
}

export interface CustomCategory {
  name: string;
  color: string;
}
