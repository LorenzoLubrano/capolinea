import { tx } from './testing/builders';
import { balancesByPerson, computeShares, refundableMinor, splitEvenly } from './splits';

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

describe('computeShares', () => {
  const MARIO = 'person-mario';
  const GIULIA = 'person-giulia';

  it('splits equally and marks the payer share as settled', () => {
    const result = computeShares(6000, { personIds: [ME, MARIO], mode: 'equal', values: {}, paidBy: ME });
    expect(result).toEqual({
      ok: true,
      shares: [
        { personId: ME, amountMinor: 3000, settled: true },
        { personId: MARIO, amountMinor: 3000, settled: false },
      ],
    });
  });

  it('keeps equal shares exact to the cent', () => {
    const result = computeShares(1000, { personIds: [ME, MARIO, GIULIA], mode: 'equal', values: {}, paidBy: MARIO });
    expect(result.ok && result.shares.map((s) => s.amountMinor)).toEqual([334, 333, 333]);
    expect(result.ok && result.shares.map((s) => s.settled)).toEqual([false, true, false]);
  });

  it('accepts amounts that add up to the total', () => {
    const result = computeShares(6000, { personIds: [ME, MARIO], mode: 'amounts', values: { [ME]: 2000, [MARIO]: 4000 }, paidBy: ME });
    expect(result.ok && result.shares.map((s) => s.amountMinor)).toEqual([2000, 4000]);
  });

  it('says how much is left when the amounts do not add up', () => {
    const result = computeShares(6000, { personIds: [ME, MARIO], mode: 'amounts', values: { [ME]: 2000, [MARIO]: 3000 }, paidBy: ME });
    expect(result).toEqual({ ok: false, reason: 'sum', differenceMinor: 1000 });
  });

  it('splits by percent, leftover cents to the first people', () => {
    const result = computeShares(1001, { personIds: [ME, MARIO], mode: 'percent', values: { [ME]: 70, [MARIO]: 30 }, paidBy: ME });
    expect(result.ok && result.shares.map((s) => s.amountMinor)).toEqual([701, 300]);
  });

  it('wants percentages that make 100', () => {
    const result = computeShares(1000, { personIds: [ME, MARIO], mode: 'percent', values: { [ME]: 60, [MARIO]: 30 }, paidBy: ME });
    expect(result).toEqual({ ok: false, reason: 'percent', differencePercent: 10 });
  });

  it('needs at least two people', () => {
    expect(computeShares(1000, { personIds: [ME], mode: 'equal', values: {}, paidBy: ME })).toEqual({ ok: false, reason: 'people' });
  });
});

describe('refundableMinor', () => {
  it('is what is left of an expense after its refunds', () => {
    const order = tx({ amountMinor: 5000 });
    const refund = tx({ type: 'refund', amountMinor: 2000, refundOfId: order.id });
    const deleted = tx({ type: 'refund', amountMinor: 1000, refundOfId: order.id, deletedAt: '2026-10-02T00:00:00Z' });
    expect(refundableMinor(order, [order, refund, deleted])).toBe(3000);
  });
});
