import {
  addDays,
  addMonthsClamped,
  dayOfMonth,
  daysBetween,
  daysInMonth,
  isWithin,
  monthEnd,
  monthGrid,
  monthStart,
  samePeriodPreviousMonth,
  toLocalDate,
  weekdayMondayFirst,
} from './dates';

describe('daysInMonth', () => {
  it('handles 30 and 31 day months', () => {
    expect(daysInMonth(2026, 9)).toBe(30);
    expect(daysInMonth(2026, 10)).toBe(31);
  });

  it('handles February in common and leap years', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('is not affected by daylight saving changes', () => {
    expect(addDays('2026-10-24', 7)).toBe('2026-10-31');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });
});

describe('addMonthsClamped', () => {
  it('keeps the day when the target month is long enough', () => {
    expect(addMonthsClamped('2026-10-15', 1)).toBe('2026-11-15');
  });

  it('clamps to the last day of shorter months', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2026-10-31', 1)).toBe('2026-11-30');
  });

  it('moves backwards and across years', () => {
    expect(addMonthsClamped('2026-01-15', -1)).toBe('2025-12-15');
    expect(addMonthsClamped('2026-11-30', 3)).toBe('2027-02-28');
  });
});

describe('month helpers', () => {
  it('returns first and last day of the month', () => {
    expect(monthStart('2026-10-24')).toBe('2026-10-01');
    expect(monthEnd('2026-10-24')).toBe('2026-10-31');
    expect(monthEnd('2028-02-03')).toBe('2028-02-29');
  });

  it('reads the day of month', () => {
    expect(dayOfMonth('2026-10-24')).toBe(24);
  });
});

describe('isWithin', () => {
  it('includes both ends', () => {
    expect(isWithin('2026-10-01', '2026-10-01', '2026-10-31')).toBe(true);
    expect(isWithin('2026-10-31', '2026-10-01', '2026-10-31')).toBe(true);
    expect(isWithin('2026-11-01', '2026-10-01', '2026-10-31')).toBe(false);
  });
});

describe('samePeriodPreviousMonth', () => {
  it('covers day 1 to the same day of the previous month', () => {
    expect(samePeriodPreviousMonth('2026-10-24')).toEqual({ from: '2026-09-01', to: '2026-09-24' });
  });

  it('stops at the end of a shorter previous month', () => {
    expect(samePeriodPreviousMonth('2026-03-31')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('crosses the year boundary', () => {
    expect(samePeriodPreviousMonth('2027-01-10')).toEqual({ from: '2026-12-01', to: '2026-12-10' });
  });
});

describe('monthGrid', () => {
  it('lays a month out in weeks starting on Monday', () => {
    const weeks = monthGrid('2026-10-01');
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(weeks[4]).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', null]);
  });

  it('handles a month that starts on Monday', () => {
    expect(monthGrid('2026-06-01')[0][0]).toBe('2026-06-01');
  });
});

describe('daysBetween', () => {
  it('counts calendar days from one date to another', () => {
    expect(daysBetween('2026-10-01', '2026-10-24')).toBe(23);
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysBetween('2026-10-24', '2026-10-24')).toBe(0);
    expect(daysBetween('2026-10-24', '2026-10-20')).toBe(-4);
  });
});

describe('weekdayMondayFirst', () => {
  it('is 0 for Monday and 6 for Sunday', () => {
    expect(weekdayMondayFirst('2026-10-19')).toBe(0);
    expect(weekdayMondayFirst('2026-10-24')).toBe(5);
    expect(weekdayMondayFirst('2026-10-25')).toBe(6);
  });
});

describe('toLocalDate', () => {
  it('reads the calendar day of the phone, not of UTC', () => {
    expect(toLocalDate(new Date(2026, 9, 8, 23, 59))).toBe('2026-10-08');
    expect(toLocalDate(new Date(2027, 0, 1, 0, 0))).toBe('2027-01-01');
  });
});
