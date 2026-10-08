import { barLabel, barTitle, comparisonWords } from './words';

const bucket = (from: string, to: string) => ({ from, to, spentMinor: 0, complete: true, future: false });

describe('comparisonWords', () => {
  it('says how far from the usual, and what the usual was', () => {
    expect(comparisonWords({ usualMinor: 136500, change: -0.124 }, true, 'month', (m) => `${m / 100} €`)).toEqual({
      text: '12% in meno del solito',
      usual: 'A questo punto del mese di solito eri a 1365 €',
      direction: 'down',
    });
    expect(comparisonWords({ usualMinor: 1000, change: 0.3 }, false, 'week', (m) => `${m / 100} €`)).toEqual({
      text: '30% in più del solito',
      usual: 'Di solito 10 €',
      direction: 'up',
    });
  });

  it('says how many times the usual from double upwards, never a four-digit percentage', () => {
    expect(comparisonWords({ usualMinor: 1000, change: 1.3 }, false, 'month', String)?.text).toBe('2,3 volte il solito');
    expect(comparisonWords({ usualMinor: 1000, change: 35.65 }, false, 'month', String)?.text).toBe('Oltre 10 volte il solito');
    expect(comparisonWords({ usualMinor: 1000, change: 0.99 }, false, 'month', String)?.text).toBe('99% in più del solito');
  });

  it('calls small changes in line', () => {
    expect(comparisonWords({ usualMinor: 1000, change: 0.04 }, false, 'month', String)?.direction).toBe('flat');
    expect(comparisonWords(null, true, 'year', String)).toBeNull();
  });
});

describe('barLabel and barTitle', () => {
  it('names months, weeks and the months of a year', () => {
    expect(barLabel(bucket('2026-10-01', '2026-10-31'), 'month')).toBe('ott');
    expect(barLabel(bucket('2026-10-12', '2026-10-18'), 'week')).toBe('12 ott');
    expect(barLabel(bucket('2026-10-01', '2026-10-31'), 'year')).toBe('O');
    expect(barTitle(bucket('2026-09-01', '2026-09-30'), 'month')).toBe('Settembre');
    expect(barTitle(bucket('2026-09-14', '2026-09-20'), 'week')).toBe('14–20 settembre');
  });
});
