import type { CustomCategory } from '../components/types';
export interface LocalPreferences { timezone: string; categories: CustomCategory[] }
export const CATEGORY_COLORS = ['bg-blue-500', 'bg-yellow-400', 'bg-orange-500', 'bg-red-600', 'bg-purple-500', 'bg-emerald-500', 'bg-pink-500'];
export function validPreferences(value: unknown): value is LocalPreferences {
  if (!value || typeof value !== 'object') return false;
  const prefs = value as LocalPreferences;
  if (typeof prefs.timezone !== 'string' || !Array.isArray(prefs.categories) || prefs.categories.length > 100) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: prefs.timezone }).format(); } catch { return false; }
  const names = new Set<string>();
  return prefs.categories.every(category => {
    if (!category || typeof category.name !== 'string' || category.name.length > 100 || !category.name.trim()
      || category.name.toLowerCase() === 'all' || !CATEGORY_COLORS.includes(category.color) || names.has(category.name)) return false;
    names.add(category.name); return true;
  });
}
