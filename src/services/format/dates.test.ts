import { dayLabel, fullDate, monthName, monthNames, monthYear, periodLabel, shortDate, shortMonth, weekdayName } from './dates';

describe('monthName', () => {
  it('names the month in Italian, lower case', () => {
    expect(monthName('2026-10-24')).toBe('ottobre');
    expect(monthName('2026-09-01')).toBe('settembre');
  });
});

describe('shortDate', () => {
  it('writes day and abbreviated month', () => {
    expect(shortDate('2026-10-22')).toBe('22 ott');
  });
});

describe('dayLabel', () => {
  it('says oggi and ieri for the last two days', () => {
    expect(dayLabel('2026-10-24', '2026-10-24')).toBe('Oggi');
    expect(dayLabel('2026-10-23', '2026-10-24')).toBe('Ieri');
  });

  it('uses weekday and date for older days', () => {
    expect(dayLabel('2026-10-20', '2026-10-24')).toBe('Martedì 20 ottobre');
  });
});

describe('monthNames', () => {
  it('lists the twelve months in Italian, January first', () => {
    const names = monthNames();
    expect(names).toHaveLength(12);
    expect(names[0]).toBe('gennaio');
    expect(names[8]).toBe('settembre');
  });
});

describe('fullDate', () => {
  it('writes weekday, day, month and year', () => {
    expect(fullDate('2026-10-20')).toBe('Martedì 20 ottobre 2026');
  });
});

describe('monthYear', () => {
  it('names month and year, capitalised', () => {
    expect(monthYear('2026-10-24')).toBe('Ottobre 2026');
  });
});

describe('periodLabel', () => {
  it('writes a week as a range of days', () => {
    expect(periodLabel({ unit: 'week', from: '2026-10-19', to: '2026-10-25' })).toBe('19–25 ottobre');
    expect(periodLabel({ unit: 'week', from: '2026-09-28', to: '2026-10-04' })).toBe('28 settembre – 4 ottobre');
    expect(periodLabel({ unit: 'week', from: '2025-12-29', to: '2026-01-04' })).toBe('29 dicembre 2025 – 4 gennaio 2026');
  });

  it('writes a month with its year and a year as a number', () => {
    expect(periodLabel({ unit: 'month', from: '2026-10-01', to: '2026-10-31' })).toBe('Ottobre 2026');
    expect(periodLabel({ unit: 'year', from: '2026-01-01', to: '2026-12-31' })).toBe('2026');
  });
});

describe('shortMonth', () => {
  it('abbreviates the month without a dot', () => {
    expect(shortMonth('2026-10-01')).toBe('ott');
    expect(shortMonth('2026-08-01')).toBe('ago');
  });
});

describe('weekdayName', () => {
  it('names the weekday, Monday first', () => {
    expect(weekdayName(0)).toBe('lunedì');
    expect(weekdayName(5)).toBe('sabato');
    expect(weekdayName(6)).toBe('domenica');
  });
});
