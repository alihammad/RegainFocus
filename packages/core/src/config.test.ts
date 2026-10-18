import { describe, expect, it } from 'vitest';
import { APP_NAME, DEFAULT_SETTINGS, TODAY_SUGGESTED_SIZE } from './config';

describe('config', () => {
  it('names the app Regain Focus', () => {
    expect(APP_NAME).toBe('Regain Focus');
  });

  it('suggests 3 tasks for Today', () => {
    expect(TODAY_SUGGESTED_SIZE).toBe(3);
  });

  it('defaults to a 9:00 to 18:00 day, 5h comfortable limit and 25-minute sprints', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      workdayStart: '09:00',
      workdayEnd: '18:00',
      comfortableHours: 5,
      sprintMinutes: 25,
    });
  });
});
