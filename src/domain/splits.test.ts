import { tx } from './testing/builders';
import { balancesByPerson, splitEvenly } from './splits';

const ME = 'person-me';

describe('splitEvenly', () => {
  it('splits into equal shares', () => {
    expect(splitEvenly(6000, [ME, 'person-mario']).map((s) => s.amountMinor)).toEqual([3000, 3000]);
  });

  it('gives leftover cents to the first people so the total stays exact', () => {
    const shares = splitEvenly(1000, [ME, 'person-mario', 'person-giulia']);
    expect(shares.map((s) => s.amountMinor)).toEqual([334, 333, 333]);
    expect(shares.every((s) => !s.settled)).toBe(true);
  });
});

describe('balancesByPerson', () => {
  it('counts what others owe me and what I owe others, unsettled shares only', () => {
    const dinner = tx({
      amountMinor: 6000,
      paidByPersonId: ME,
      split: [
        { personId: ME, amountMinor: 3000, settled: false },
        { personId: 'person-mario', amountMinor: 3000, settled: false },
      ],
    });
    const cinema = tx({
      amountMinor: 2400,
      paidByPersonId: 'person-giulia',
      split: [
        { personId: ME, amountMinor: 1200, settled: false },
        { personId: 'person-giulia', amountMinor: 1200, settled: false },
      ],
    });
    const settled = tx({
      amountMinor: 1000,
      paidByPersonId: ME,
      split: [
        { personId: ME, amountMinor: 500, settled: false },
        { personId: 'person-mario', amountMinor: 500, settled: true },
      ],
    });

    expect(balancesByPerson([dinner, cinema, settled], ME)).toEqual({
      'person-mario': 3000,
      'person-giulia': -1200,
    });
  });
});
