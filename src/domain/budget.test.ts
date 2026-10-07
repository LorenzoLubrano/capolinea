import { tx } from './testing/builders';
import { budgetStatus, forecastMonthEnd, monthPace } from './budget';

const ME = 'person-me';

describe('monthPace', () => {
  it('is the share of the month elapsed, today included', () => {
    expect(monthPace('2026-10-24')).toBeCloseTo(24 / 31);
    expect(monthPace('2026-02-28')).toBe(1);
  });
});

describe('forecastMonthEnd', () => {
  it('adds upcoming recurring charges and projects only variable spending', () => {
    const txs = [
      tx({ date: '2026-10-01', amountMinor: 55000, isRecurring: true }), // rent
      tx({ date: '2026-10-05', amountMinor: 1099, subscriptionId: 'sub-spotify' }),
      tx({ date: '2026-10-10', amountMinor: 24000 }), // variable: 240 € in 24 days = 10 €/day
    ];
    const forecast = forecastMonthEnd(txs, '2026-10-24', {
      currency: 'EUR',
      meId: ME,
      upcomingRecurringMinor: 4989,
    });
    // spent 80.099 € + upcoming 49,89 € + 10 €/day × 7 days
    expect(forecast).toBe(55000 + 1099 + 24000 + 4989 + 7000);
  });

  it('equals what was spent on the last day of the month', () => {
    const txs = [tx({ date: '2026-10-31', amountMinor: 1500 })];
    expect(forecastMonthEnd(txs, '2026-10-31', { currency: 'EUR', meId: ME, upcomingRecurringMinor: 0 })).toBe(1500);
  });
});

describe('budgetStatus', () => {
  const pace = 0.5;

  it('is over when spending exceeds the budget', () => {
    expect(budgetStatus({ spentMinor: 160100, budgetMinor: 160000, pace })).toBe('over');
  });

  it('is near the limit from 80% of the budget', () => {
    expect(budgetStatus({ spentMinor: 128000, budgetMinor: 160000, pace: 0.9 })).toBe('near');
  });

  it('is ahead of pace when spending runs more than 5 points over the month elapsed', () => {
    expect(budgetStatus({ spentMinor: 90000, budgetMinor: 160000, pace })).toBe('ahead');
  });

  it('is on track otherwise', () => {
    expect(budgetStatus({ spentMinor: 80000, budgetMinor: 160000, pace })).toBe('on_track');
  });

  it('accepts a custom near-limit threshold', () => {
    expect(budgetStatus({ spentMinor: 112000, budgetMinor: 160000, pace: 0.9, nearThreshold: 0.7 })).toBe('near');
  });
});
