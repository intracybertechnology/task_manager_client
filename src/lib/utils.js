import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatMinutes(mins) {
  if (!mins && mins !== 0) return "0m";
  const hours = Math.floor(mins / 60);
  const remainingMinutes = mins % 60;
  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${remainingMinutes}m`;
}

// Returns today's date as YYYY-MM-DD in the browser's local timezone.
// Never use new Date().toISOString().split('T')[0] — that gives UTC date,
// which is one day behind for timezones east of UTC (IST, GST, etc.).
export function localDateStr(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Offset today by N days (negative = past, positive = future), returns YYYY-MM-DD local.
export function localDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return localDateStr(d);
}

// How a task came to this person. Used everywhere so the wording is identical.
//   recurring  -> from a repeating template (created by a job, not a person)
//   reassigned -> created because an earlier task was missed
//   assigned   -> someone gave it to them directly
export function taskSource(task, frequency) {
  if (!task) return { key: 'assigned', label: 'Assigned', detail: '' };
  if (task.reassigned_from) {
    return { key: 'reassigned', label: 'Reassigned', detail: 'Moved here after being missed.' };
  }
  if (task.task_type === 'RECURRING' || task.auto_generated) {
    const label = frequency
      ? String(frequency).charAt(0) + String(frequency).slice(1).toLowerCase()
      : 'Recurring';
    return {
      key: 'recurring',
      label,
      detail: 'Part of a repeating template. Time changes apply to this day only.',
    };
  }
  return { key: 'assigned', label: 'Assigned', detail: '' };
}

