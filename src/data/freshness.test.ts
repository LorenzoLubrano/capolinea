import { readOnAnotherDay } from './freshness';

// Local times, as the phone's clock gives them.
const at = (local: string) => new Date(local);

describe('readOnAnotherDay', () => {
  it('is false later on the same day', () => {
    expect(readOnAnotherDay(at('2026-10-09T08:00:00').getTime(), at('2026-10-09T23:59:00'))).toBe(false);
  });

  it('is true once midnight has passed', () => {
    expect(readOnAnotherDay(at('2026-10-09T23:59:00').getTime(), at('2026-10-10T00:01:00'))).toBe(true);
  });

  it('is false when nothing was read yet', () => {
    expect(readOnAnotherDay(0, at('2026-10-10T00:01:00'))).toBe(false);
  });
});
