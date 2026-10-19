import { describe, expect, it } from 'vitest';
import type { Task } from '@regain/core';
import { formatCaptureTime, isToday, localDateKey, tagsFor } from './time';

// Local-time constructors, so the tests don't depend on the machine's time zone.
const at = (h: number, min: number, day = 19) => new Date(2026, 9, day, h, min, 30);

describe('formatCaptureTime', () => {
  const now = at(10, 30);

  it('says Just now within a minute', () => {
    expect(formatCaptureTime(at(10, 30).toISOString(), now)).toBe('Just now');
  });

  it('shows the time for earlier today, lower-case am/pm', () => {
    expect(formatCaptureTime(at(10, 2).toISOString(), now)).toBe('10:02 am');
    expect(formatCaptureTime(at(9, 5).toISOString(), at(15, 0))).toBe('9:05 am');
    expect(formatCaptureTime(at(14, 40).toISOString(), at(15, 0))).toBe('2:40 pm');
  });

  it('shows the day for earlier days', () => {
    expect(formatCaptureTime(at(16, 12, 15).toISOString(), now)).toBe('Thu 15 Oct');
  });
});

describe('isToday and localDateKey', () => {
  it('compares local calendar days', () => {
    expect(isToday(at(0, 5).toISOString(), at(23, 55))).toBe(true);
    expect(isToday(at(23, 55, 18).toISOString(), at(0, 5))).toBe(false);
    expect(localDateKey(at(12, 0))).toBe('2026-10-19');
  });
});

describe('tagsFor', () => {
  const base = { id: 'x' } as Task;

  it('lists the when and energy tags with UI labels', () => {
    expect(tagsFor({ ...base, when: 'this_week', energy: 'deep' })).toEqual([
      'This week',
      'Deep focus',
    ]);
    expect(tagsFor({ ...base, when: 'today', energy: 'quick' })).toEqual(['Today', 'Quick win']);
  });

  it('is empty without tags', () => {
    expect(tagsFor(base)).toEqual([]);
  });
});
