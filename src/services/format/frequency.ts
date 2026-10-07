import type { Frequency } from '@/domain/types';
import { it } from '@/i18n/it';

/** `Ogni mese`, `Ogni 3 mesi`, `Ogni 2 settimane`. */
export function frequencyLabel({ unit, interval }: Frequency): string {
  const words = it.frequency.units[unit];
  return interval === 1 ? `${it.frequency.every} ${words.one}` : `${it.frequency.every} ${interval} ${words.many}`;
}
