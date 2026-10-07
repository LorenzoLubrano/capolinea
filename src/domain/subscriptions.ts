import { addDays, addMonthsClamped } from './dates';
import type { Frequency, Id, LocalDate, Subscription, Timestamp, Transaction } from './types';

/** The k-th billing date, always computed from the anchor so day 31 survives short months. */
function occurrence(anchor: LocalDate, frequency: Frequency, k: number): LocalDate {
  const steps = frequency.interval * k;
  switch (frequency.unit) {
    case 'week':
      return addDays(anchor, 7 * steps);
    case 'month':
      return addMonthsClamped(anchor, steps);
    case 'year':
      return addMonthsClamped(anchor, 12 * steps);
  }
}

/** First billing date strictly after `date`. */
export function occurrenceAfter(anchor: LocalDate, frequency: Frequency, date: LocalDate): LocalDate {
  let k = 0;
  let candidate = occurrence(anchor, frequency, k);
  while (candidate <= date) {
    k += 1;
    candidate = occurrence(anchor, frequency, k);
  }
  return candidate;
}

/** Billing dates inside `[from, to]`, respecting start, end and the active flag. */
export function chargesBetween(subscription: Subscription, from: LocalDate, to: LocalDate): LocalDate[] {
  if (!subscription.active) return [];
  const { anchorDate, frequency, startDate, endDate } = subscription;
  const last = endDate && endDate < to ? endDate : to;
  const dates: LocalDate[] = [];
  let date = from > anchorDate ? occurrenceAfter(anchorDate, frequency, addDays(from, -1)) : anchorDate;
  while (date <= last) {
    if (date >= startDate) dates.push(date);
    date = occurrenceAfter(anchorDate, frequency, date);
  }
  return dates;
}

export interface GenerateOptions {
  makeId: () => Id;
  now: Timestamp;
}

export interface GenerationResult {
  charges: Transaction[];
  /** Subscriptions with `nextBillingDate` moved past today. */
  subscriptions: Subscription[];
}

/**
 * Creates the charges due up to today, including months missed while the app was closed.
 * Idempotent: a charge already recorded for the same subscription and billing date is never duplicated.
 */
export function generateDueCharges(
  subscriptions: Subscription[],
  existing: Transaction[],
  today: LocalDate,
  { makeId, now }: GenerateOptions,
): GenerationResult {
  const recorded = new Set(
    existing.filter((tx) => tx.subscriptionId).map((tx) => `${tx.subscriptionId}|${tx.occurrenceDate}`),
  );
  const charges: Transaction[] = [];

  const updated = subscriptions.map((subscription) => {
    if (!subscription.active) return subscription;
    let next = subscription.nextBillingDate;

    while (next <= today && (!subscription.endDate || next <= subscription.endDate)) {
      if (!recorded.has(`${subscription.id}|${next}`)) {
        charges.push({
          id: makeId(),
          createdAt: now,
          updatedAt: now,
          type: 'expense',
          amountMinor: subscription.amountMinor,
          currency: subscription.currency,
          date: next,
          accountId: subscription.accountId,
          categoryId: subscription.categoryId,
          merchant: subscription.name,
          tags: [],
          isRecurring: true,
          subscriptionId: subscription.id,
          occurrenceDate: next,
        });
      }
      next = occurrenceAfter(subscription.anchorDate, subscription.frequency, next);
    }

    return next === subscription.nextBillingDate ? subscription : { ...subscription, nextBillingDate: next, updatedAt: now };
  });

  return { charges, subscriptions: updated };
}
