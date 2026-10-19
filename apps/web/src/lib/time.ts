import type { Task } from '@regain/core';

const LOCALE = 'en-AU';

/** Local calendar date as YYYY-MM-DD. */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isToday(iso: string, now: Date): boolean {
  return localDateKey(new Date(iso)) === localDateKey(now);
}

/** "Just now", "10:02 am", or "Thu 15 Oct". Calm and relative, never "late". */
export function formatCaptureTime(iso: string, now: Date): string {
  const then = new Date(iso);
  if (now.getTime() - then.getTime() < 60_000) return 'Just now';
  if (isToday(iso, now)) {
    return then
      .toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit', hour12: true })
      .replace(/\s?([ap])m/i, (_, c: string) => ` ${c.toLowerCase()}m`);
  }
  return then
    .toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(',', '');
}

const WHEN_LABEL = { today: 'Today', this_week: 'This week', flexible: 'Flexible' } as const;
const ENERGY_LABEL = { quick: 'Quick win', medium: 'Medium', deep: 'Deep focus' } as const;

/** The small chips shown under a captured item. */
export function tagsFor(task: Task): string[] {
  const tags: string[] = [];
  if (task.when) tags.push(WHEN_LABEL[task.when]);
  if (task.energy) tags.push(ENERGY_LABEL[task.energy]);
  return tags;
}
