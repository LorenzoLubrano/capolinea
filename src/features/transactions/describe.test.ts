import { tx } from '@/domain/testing/builders';

import { describeTransaction } from './describe';

const names = { categoryName: 'Ristoranti', accountName: 'Revolut' };

describe('describeTransaction', () => {
  it('names category and account', () => {
    expect(describeTransaction(tx({}), names)).toBe('Ristoranti · Revolut');
  });

  it('marks subscription charges and split expenses', () => {
    expect(describeTransaction(tx({ subscriptionId: 'sub-1' }), names)).toBe('Ristoranti · Revolut · abbonamento');
    expect(describeTransaction(tx({ split: [] }), names)).toBe('Ristoranti · Revolut · divisa');
  });

  it('shows where a transfer goes', () => {
    expect(describeTransaction(tx({ type: 'transfer' }), { accountName: 'Conto corrente', toAccountName: 'Conto deposito' })).toBe(
      'Conto corrente → Conto deposito',
    );
  });

  it('can leave the account out', () => {
    expect(describeTransaction(tx({}), { categoryName: 'Ristoranti' })).toBe('Ristoranti');
  });
});
