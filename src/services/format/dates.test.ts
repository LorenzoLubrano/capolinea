import { dayLabel, fullDate, monthName, monthNames, shortDate } from './dates';

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
