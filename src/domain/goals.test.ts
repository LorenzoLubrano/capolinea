import { goalProgress } from './goals';
import type { Goal } from './types';

const base: Goal = {
  id: 'goal-macbook',
  createdAt: '2026-06-01T08:00:00Z',
  updatedAt: '2026-06-01T08:00:00Z',
  name: 'MacBook',
  icon: 'Laptop',
  color: 'slate',
  targetMinor: 200000,
  currency: 'EUR',
  targetDate: '2027-03-31',
  contributions: [
    { id: 'c1', date: '2026-06-11', amountMinor: 30000 },
    { id: 'c2', date: '2026-07-11', amountMinor: 20000 },
    { id: 'c3', date: '2026-08-11', amountMinor: 15000 },
    { id: 'c4', date: '2026-09-11', amountMinor: 10000 },
    { id: 'c5', date: '2026-10-11', amountMinor: 10000 },
  ],
};

describe('goalProgress', () => {
  it('adds up the contributions', () => {
    const p = goalProgress(base, '2026-10-24');
    expect(p.savedMinor).toBe(85000);
    expect(p.remainingMinor).toBe(115000);
    expect(p.ratio).toBeCloseTo(0.425);
    expect(p.reached).toBe(false);
  });

  it('says how much to put aside each month to make the date', () => {
    expect(goalProgress(base, '2026-10-24').monthlyNeededMinor).toBe(23000);
    expect(goalProgress({ ...base, targetDate: undefined }, '2026-10-24').monthlyNeededMinor).toBeNull();
  });

  it('projects the arrival from the last three months of contributions', () => {
    expect(goalProgress(base, '2026-10-24').projectedDate).toBe('2027-08-24');
    expect(goalProgress({ ...base, contributions: [] }, '2026-10-24').projectedDate).toBeNull();
  });

  it('is reached at the target, with nothing left to save', () => {
    const p = goalProgress({ ...base, targetMinor: 80000 }, '2026-10-24');
    expect(p).toMatchObject({ reached: true, remainingMinor: 0, ratio: 1, monthlyNeededMinor: null, projectedDate: null });
  });
});
