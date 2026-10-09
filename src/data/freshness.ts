import { toLocalDate } from '@/domain/dates';

/** Data read on another calendar day carries a stale «today»: it must be read again. */
export function readOnAnotherDay(readAt: number, now: Date): boolean {
  return readAt > 0 && toLocalDate(new Date(readAt)) !== toLocalDate(now);
}
