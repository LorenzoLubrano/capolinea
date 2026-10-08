import { addMonthsClamped } from './dates';
import type { Goal, LocalDate } from './types';

const PACE_MONTHS = 3;

export interface GoalProgress {
  savedMinor: number;
  remainingMinor: number;
  /** 0 to 1. */
  ratio: number;
  reached: boolean;
  /** The target date has passed and the goal is not reached. */
  overdue: boolean;
  /** To put aside each month to reach the target date; null without a date, once reached or once late. */
  monthlyNeededMinor: number | null;
  /** When the goal is reached at the pace of the last three months; null without recent contributions. */
  projectedDate: LocalDate | null;
  /** At that pace the goal arrives in a month after its target date (still ahead). */
  late: boolean;
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

  const overdue = !reached && !!goal.targetDate && goal.targetDate < today;
  const monthlyNeededMinor =
    reached || overdue || !goal.targetDate ? null : Math.ceil(remainingMinor / Math.max(monthsBetween(today, goal.targetDate), 1));

  const windowStart = addMonthsClamped(today, -PACE_MONTHS);
  const recent = goal.contributions.filter((c) => c.date > windowStart && c.date <= today).reduce((sum, c) => sum + c.amountMinor, 0);
  const pace = recent / PACE_MONTHS;
  const projectedDate = reached || pace <= 0 ? null : addMonthsClamped(today, Math.ceil(remainingMinor / pace));

  const late = !overdue && !!goal.targetDate && projectedDate !== null && projectedDate.slice(0, 7) > goal.targetDate.slice(0, 7);

  return { savedMinor, remainingMinor, ratio, reached, overdue, monthlyNeededMinor, projectedDate, late };
}

/** Where each contribution up to today left the goal, as shares of the target: the stops on its line. */
export function goalStops(goal: Goal, today: LocalDate): number[] {
  const stops: number[] = [];
  if (goal.targetMinor <= 0) return stops;
  let saved = 0;
  const contributions = goal.contributions.filter((c) => c.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  for (const contribution of contributions) {
    saved += contribution.amountMinor;
    stops.push(Math.min(saved / goal.targetMinor, 1));
    if (saved >= goal.targetMinor) break;
  }
  return stops;
}

/** Stops closer than `gap` (a share of the line) to a later one are left out, so rings never pile up: the latest stays. */
export function spacedStops(stops: number[], gap: number): number[] {
  const kept: number[] = [];
  for (const share of [...stops].sort((a, b) => b - a)) {
    if (kept.length === 0 || kept[kept.length - 1] - share >= gap - 1e-9) kept.push(share);
  }
  return kept.reverse();
}
