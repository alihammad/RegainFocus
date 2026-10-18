// App-wide constants. Change a value here, nowhere else.

export const APP_NAME = 'Regain Focus';

// Today is sized for this many tasks. Going over shows a warning; it is never a block.
export const TODAY_SUGGESTED_SIZE = 3;

export const DEFAULT_SETTINGS = {
  workdayStart: '09:00',
  workdayEnd: '18:00',
  comfortableHours: 5,
  sprintMinutes: 25,
} as const;
