import { TODAY_SUGGESTED_SIZE } from '../config';
import type { Task } from '../model/types';

export interface TodayStatus {
  count: number;
  suggestedSize: number;
  isOver: boolean;
  /** Calm amber warning copy when over the suggested size, otherwise null. Never a block. */
  warning: string | null;
}

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

/** Tasks that count towards Today for a given ISO date (YYYY-MM-DD). */
export function tasksForToday(tasks: readonly Task[], date: string): Task[] {
  return tasks
    .filter((t) => t.todayDate === date && !t.deletedAt && t.status === 'active')
    .sort((a, b) => (a.todayOrder ?? 0) - (b.todayOrder ?? 0));
}

/** The one rule the UI and the tests share for "is Today over the suggested size". */
export function todayStatus(count: number, suggestedSize = TODAY_SUGGESTED_SIZE): TodayStatus {
  const isOver = count > suggestedSize;
  const size = WORDS[suggestedSize] ?? String(suggestedSize);
  return {
    count,
    suggestedSize,
    isOver,
    warning: isOver
      ? `That's ${count} for today. ${size} is easier to finish. Keep it, or move one to tomorrow.`
      : null,
  };
}
