import { it } from '@/i18n/it';

export type NotificationRule =
  | 'budgetNear'
  | 'budgetOver'
  | 'subscriptionSoon'
  | 'chargeCreated'
  | 'largeExpense'
  | 'weeklySummary'
  | 'monthlySummary'
  | 'eveningReminder'
  | 'goals';

/**
 * What a rule would send, written on example values. With privacy on there is no figure at all,
 * not even a percentage: the notification can show up on a locked screen.
 */
export function notificationPreview(rule: NotificationRule, { masked, threshold }: { masked: boolean; threshold: number }): { title: string; body: string } {
  const sample = it.notificationRules.samples[rule];
  return { title: sample.title, body: masked ? sample.masked : sample.body(threshold) };
}
