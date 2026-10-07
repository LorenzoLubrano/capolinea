import type { Frequency, Id } from '@/domain/types';

export interface SubscriptionTemplate {
  name: string;
  /** Example price: the user checks it against their own plan. */
  amountMinor: number;
  frequency: Frequency;
  categoryId: Id;
}

const monthly: Frequency = { unit: 'month', interval: 1 };
const yearly: Frequency = { unit: 'year', interval: 1 };

/** Common subscriptions, names as text only (no logos in a public repository). */
export const SUBSCRIPTION_TEMPLATES: SubscriptionTemplate[] = [
  { name: 'Netflix', amountMinor: 1399, frequency: monthly, categoryId: 'cat-subscriptions' },
  { name: 'Spotify', amountMinor: 1099, frequency: monthly, categoryId: 'cat-subscriptions' },
  { name: 'Disney+', amountMinor: 899, frequency: monthly, categoryId: 'cat-subscriptions' },
  { name: 'YouTube Premium', amountMinor: 1299, frequency: monthly, categoryId: 'cat-subscriptions' },
  { name: 'iCloud+', amountMinor: 299, frequency: monthly, categoryId: 'cat-subscriptions' },
  { name: 'Amazon Prime', amountMinor: 4990, frequency: yearly, categoryId: 'cat-subscriptions' },
  { name: 'Palestra', amountMinor: 3990, frequency: monthly, categoryId: 'cat-health' },
  { name: 'Telefono', amountMinor: 999, frequency: monthly, categoryId: 'cat-bills' },
  { name: 'Internet casa', amountMinor: 2790, frequency: monthly, categoryId: 'cat-bills' },
  { name: 'Assicurazione auto', amountMinor: 45600, frequency: yearly, categoryId: 'cat-transport' },
];
