import { tx } from './testing/builders';
import { balancesByPerson, computeShares, openItems, refundableMinor, settlementPlan, splitEvenly } from './splits';

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

describe('openItems and settlementPlan', () => {
  const dinner = tx({
    date: '2026-10-18',
    amountMinor: 6000,
    paidByPersonId: ME,
    split: [
      { personId: ME, amountMinor: 3000, settled: true },
      { personId: 'person-mario', amountMinor: 3000, settled: false },
    ],
  });
  const cinema = tx({
    date: '2026-09-26',
    amountMinor: 2400,
    paidByPersonId: 'person-mario',
    split: [
      { personId: ME, amountMinor: 1200, settled: false },
      { personId: 'person-mario', amountMinor: 1200, settled: false },
    ],
  });
  const pizza = tx({
    date: '2026-10-10',
    amountMinor: 2000,
    split: [
      { personId: ME, amountMinor: 1000, settled: true },
      { personId: 'person-giulia', amountMinor: 1000, settled: false },
    ],
  });
  const old = tx({
    date: '2026-08-10',
    amountMinor: 1000,
    split: [
      { personId: ME, amountMinor: 500, settled: true },
      { personId: 'person-mario', amountMinor: 500, settled: true, settledAt: '2026-08-20' },
    ],
  });
  const txs = [dinner, cinema, pizza, old];

  it('lists what is still open with one person, newest first: positive they owe me, negative I owe', () => {
    expect(openItems(txs, ME, 'person-mario')).toEqual([
      { tx: dinner, amountMinor: 3000 },
      { tx: cinema, amountMinor: -1200 },
    ]);
  });

  it('settles every open share between me and the person, and says who pays whom', () => {
    const plan = settlementPlan(txs, ME, 'person-mario', '2026-10-24');
    expect(plan.amountMinor).toBe(1800);
    expect(plan.changes).toEqual([
      { id: dinner.id, split: [dinner.split![0], { personId: 'person-mario', amountMinor: 3000, settled: true, settledAt: '2026-10-24' }] },
      { id: cinema.id, split: [{ personId: ME, amountMinor: 1200, settled: true, settledAt: '2026-10-24' }, cinema.split![1]] },
    ]);
  });

  it('leaves the shares of other people alone', () => {
    expect(settlementPlan(txs, ME, 'person-giulia', '2026-10-24').changes.map((c) => c.id)).toEqual([pizza.id]);
  });
});
