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
}

export interface TaskCreateRequest {
  title: string;
  description?: string | null;
  dueAt?: string | null;
  category?: string | null;
  priority?: Priority;
}

export interface TaskUpdateRequest {
  title: string;
  description?: string | null;
  dueAt?: string | null;
  category?: string | null;
  priority?: Priority;
  status?: TaskStatus;
}

export interface CustomCategory {
  name: string;
  color: string;
}

export interface TimezoneOption {
  label: string;
  value: string;
}

export const TIMEZONES: TimezoneOption[] = [
  { label: 'Local System', value: Intl.DateTimeFormat().resolvedOptions().timeZone },
  { label: 'UTC', value: 'UTC' },
  { label: 'HST — Honolulu', value: 'Pacific/Honolulu' },
  { label: 'AKST — Anchorage', value: 'America/Anchorage' },
  { label: 'PST — Los Angeles', value: 'America/Los_Angeles' },
  { label: 'MST — Denver', value: 'America/Denver' },
  { label: 'CST — Chicago', value: 'America/Chicago' },
  { label: 'EST — New York', value: 'America/New_York' },
  { label: 'EST — Toronto', value: 'America/Toronto' },
  { label: 'CST — Mexico City', value: 'America/Mexico_City' },
  { label: 'COT — Bogota', value: 'America/Bogota' },
  { label: 'VET — Caracas', value: 'America/Caracas' },
  { label: 'BRT — São Paulo', value: 'America/Sao_Paulo' },
  { label: 'ART — Buenos Aires', value: 'America/Argentina/Buenos_Aires' },
  { label: 'GMT — London', value: 'Europe/London' },
  { label: 'CET — Paris', value: 'Europe/Paris' },
  { label: 'CET — Berlin', value: 'Europe/Berlin' },
  { label: 'CET — Rome', value: 'Europe/Rome' },
  { label: 'CET — Madrid', value: 'Europe/Madrid' },
  { label: 'CET — Amsterdam', value: 'Europe/Amsterdam' },
  { label: 'CET — Zurich', value: 'Europe/Zurich' },
  { label: 'CET — Warsaw', value: 'Europe/Warsaw' },
  { label: 'EET — Helsinki', value: 'Europe/Helsinki' },
  { label: 'EET — Athens', value: 'Europe/Athens' },
  { label: 'TRT — Istanbul', value: 'Europe/Istanbul' },
  { label: 'MSK — Moscow', value: 'Europe/Moscow' },
  { label: 'WAT — Lagos', value: 'Africa/Lagos' },
  { label: 'EET — Cairo', value: 'Africa/Cairo' },
  { label: 'EAT — Nairobi', value: 'Africa/Nairobi' },
  { label: 'SAST — Johannesburg', value: 'Africa/Johannesburg' },
  { label: 'GST — Dubai', value: 'Asia/Dubai' },
  { label: 'PKT — Karachi', value: 'Asia/Karachi' },
  { label: 'IST — Kolkata', value: 'Asia/Kolkata' },
  { label: 'BST — Dhaka', value: 'Asia/Dhaka' },
  { label: 'ICT — Bangkok', value: 'Asia/Bangkok' },
  { label: 'SGT — Singapore', value: 'Asia/Singapore' },
  { label: 'CST — Shanghai', value: 'Asia/Shanghai' },
  { label: 'HKT — Hong Kong', value: 'Asia/Hong_Kong' },
  { label: 'JST — Tokyo', value: 'Asia/Tokyo' },
  { label: 'KST — Seoul', value: 'Asia/Seoul' },
  { label: 'AWST — Perth', value: 'Australia/Perth' },
  { label: 'AEST — Sydney', value: 'Australia/Sydney' },
  { label: 'NZST — Auckland', value: 'Pacific/Auckland' },
];
