import type { Snapshot } from '@/data/repositories';
import { toLocalDate } from '@/domain/dates';
import { goalProgress } from '@/domain/goals';
import { buildBudgetOverview } from '@/features/budget/overview';
import type { NotificationRule } from '@/features/settings/notification-preview';
import { it } from '@/i18n/it';
import { formatMoney } from '@/services/format/money';
import type { NotificationRules } from '@/state/settings';

/** Something true now that a notification can tell, once. */
export interface Notice {
  /** Stable for the same event: a budget in a month, a movement, a goal's milestone. */
  key: string;
  rule: NotificationRule;
  title: string;
  body: string;
  /** Notices of one goal: when several are new together, only the last one goes. */
  group?: string;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MILESTONES = [25, 50, 75, 100];

/**
 * Every event that is true now, for every rule (on or off): budgets at the threshold or past it this
 * month, subscription charges and large expenses entered in the last week, goal milestones passed.
 * With privacy on there is no figure.
 */
export function currentNotices(snapshot: Snapshot, rules: NotificationRules, { privacy, now }: { privacy: boolean; now: Date }): Notice[] {
  const { currency, today } = snapshot;
  const money = (minor: number) => formatMoney(minor, currency);
  const messages = it.notificationMessages;
  const samples = it.notificationRules.samples;
  const month = today.slice(0, 7);
  const notices: Notice[] = [];

  const overview = buildBudgetOverview(snapshot);
  const budgets = [
    ...(overview.global
      ? [{ budgetId: overview.global.budgetId, name: messages.monthBudget, budgetMinor: overview.global.amountMinor, spentMinor: overview.global.spentMinor }]
      : []),
    ...overview.categories,
  ];
  for (const { budgetId, name, budgetMinor, spentMinor } of budgets) {
    if (spentMinor > budgetMinor) {
      const body = privacy ? messages.budgetOverMasked(name) : messages.budgetOver(name, money(spentMinor - budgetMinor));
      notices.push({ key: `budgetOver:${budgetId}:${month}`, rule: 'budgetOver', title: samples.budgetOver.title, body });
    } else if (spentMinor * 100 >= budgetMinor * rules.budgetNearThreshold) {
      const percent = Math.round((spentMinor / budgetMinor) * 100);
      const body = privacy ? messages.budgetNearMasked(name) : messages.budgetNear(name, percent, money(budgetMinor - spentMinor), overview.daysLeft);
      notices.push({ key: `budgetNear:${budgetId}:${month}`, rule: 'budgetNear', title: samples.budgetNear.title, body });
    }
  }

  const categoryName = new Map(snapshot.categories.map((c) => [c.id, c.name]));
  for (const tx of snapshot.transactions) {
    const age = now.getTime() - Date.parse(tx.createdAt);
    if (tx.deletedAt || age < 0 || age > WEEK_MS) continue;
    if (tx.subscriptionId) {
      const name = tx.merchant ?? '';
      const body = privacy ? messages.chargeCreatedMasked(name) : messages.chargeCreated(name, money(tx.amountMinor));
      notices.push({ key: `charge:${tx.id}`, rule: 'chargeCreated', title: samples.chargeCreated.title, body });
    } else if (tx.type === 'expense' && !tx.settlementWith && tx.amountMinor >= rules.largeExpenseMinor) {
      const label = tx.merchant ?? tx.description ?? (tx.categoryId ? categoryName.get(tx.categoryId) : undefined) ?? messages.anExpense;
      const body = privacy ? samples.largeExpense.masked : messages.largeExpense(label, money(tx.amountMinor));
      notices.push({ key: `large:${tx.id}`, rule: 'largeExpense', title: samples.largeExpense.title, body });
    }
  }

  for (const goal of snapshot.goals) {
    const progress = goalProgress(goal, toLocalDate(now));
    for (const milestone of MILESTONES) {
      if (progress.ratio * 100 < milestone) break;
      const body = privacy ? samples.goals.masked : messages.goal(money(progress.savedMinor), money(goal.targetMinor));
      notices.push({ key: `goal:${goal.id}:${milestone}`, rule: 'goals', title: messages.goalTitle(goal.name, milestone), body, group: goal.id });
    }
  }

  return notices;
}

/**
 * Which notices are news. `seen` holds the keys true at the last check, null when there was none:
 * the first check only takes note, so installing, restoring or turning a rule on sends nothing old.
 * Keys no longer true are forgotten, so the same event can be news again later.
 */
export function noticesToSend(current: Notice[], seen: string[] | null, rules: NotificationRules): { send: Notice[]; seen: string[] } {
  const keys = current.map((notice) => notice.key);
  if (seen === null) return { send: [], seen: keys };
  const known = new Set(seen);
  const fresh = current.filter((notice) => !known.has(notice.key) && rules[notice.rule]);
  const send = fresh.filter((notice, i) => !notice.group || !fresh.slice(i + 1).some((later) => later.group === notice.group));
  return { send, seen: keys };
}
