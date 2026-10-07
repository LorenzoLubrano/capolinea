import { dayLabel, monthName, shortDate } from './dates';

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
