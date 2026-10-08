import { addMonthsClamped } from './dates';
import type { Goal, LocalDate } from './types';

const PACE_MONTHS = 3;

export interface GoalProgress {
  savedMinor: number;
  remainingMinor: number;
  /** 0 to 1. */
  ratio: number;
  reached: boolean;
  /** To put aside each month to reach the target date; null without a date or once reached. */
  monthlyNeededMinor: number | null;
  /** When the goal is reached at the pace of the last three months; null without recent contributions. */
  projectedDate: LocalDate | null;
}

function monthsBetween(from: LocalDate, to: LocalDate): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export function goalProgress(goal: Goal, today: LocalDate): GoalProgress {
  const savedMinor = goal.contributions.filter((c) => c.date <= today).reduce((sum, c) => sum + c.amountMinor, 0);
  const remainingMinor = Math.max(goal.targetMinor - savedMinor, 0);
  const reached = remainingMinor === 0;
  const ratio = goal.targetMinor > 0 ? Math.min(savedMinor / goal.targetMinor, 1) : 1;

  const monthlyNeededMinor =
    reached || !goal.targetDate ? null : Math.ceil(remainingMinor / Math.max(monthsBetween(today, goal.targetDate), 1));

  const windowStart = addMonthsClamped(today, -PACE_MONTHS);
  const recent = goal.contributions.filter((c) => c.date > windowStart && c.date <= today).reduce((sum, c) => sum + c.amountMinor, 0);
  const pace = recent / PACE_MONTHS;
  const projectedDate = reached || pace <= 0 ? null : addMonthsClamped(today, Math.ceil(remainingMinor / pace));

  return { savedMinor, remainingMinor, ratio, reached, monthlyNeededMinor, projectedDate };
}
