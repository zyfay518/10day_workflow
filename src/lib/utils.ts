import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns the current local date in YYYY-MM-DD format.
 * Fixes timezone bugs caused by new Date().toISOString() which returns UTC time.
 */
export function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  // Accept: YYYY-MM-DD / ISO string / locale-like date strings
  const raw = String(value).trim();
  const normalized = raw.includes('T') ? raw.slice(0, 10) : raw;
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  // Final fallback
  return new Date(1970, 0, 1);
}

export function getCycleDisplayStatus(
  cycle: { start_date: string; end_date: string },
  date: string | Date = new Date()
): 'completed' | 'ongoing' | 'not_started' {
  const target = toDateOnly(date);
  const start = toDateOnly(cycle.start_date);
  const end = toDateOnly(cycle.end_date);

  if (target < start) return 'not_started';
  if (target > end) return 'completed';
  return 'ongoing';
}

export function isDateInCycle(cycle: { start_date: string; end_date: string }, date: string | Date = new Date()): boolean {
  return getCycleDisplayStatus(cycle, date) === 'ongoing';
}
