import { accessibleMoney, formatMoney } from './money';

// Intl separates number and symbol with a no-break space; tests read it as a plain space.
const plain = (text: string) => text.replace(/ | /g, ' ');

describe('formatMoney', () => {
  it('uses the Italian format by default', () => {
    expect(plain(formatMoney(128462, 'EUR'))).toBe('1.284,62 €');
    expect(plain(formatMoney(150, 'EUR'))).toBe('1,50 €');
  });

  it('marks expenses with a true minus sign and income with a plus', () => {
    expect(plain(formatMoney(4280, 'EUR', { sign: 'expense' }))).toBe('−42,80 €');
    expect(plain(formatMoney(175000, 'EUR', { sign: 'income' }))).toBe('+1.750,00 €');
  });

  it('writes negative balances with a true minus sign', () => {
    expect(plain(formatMoney(-50000, 'EUR'))).toBe('−500,00 €');
  });

  it('can round to whole units', () => {
    expect(plain(formatMoney(128462, 'EUR', { wholeUnits: true }))).toBe('1.285 €');
  });

  it('hides the amount but keeps the currency in privacy mode', () => {
    expect(plain(formatMoney(128462, 'EUR', { masked: true }))).toBe('•••• €');
    expect(plain(formatMoney(4280, 'EUR', { masked: true, sign: 'expense' }))).toBe('•••• €');
  });
});

describe('accessibleMoney', () => {
  it('spells the currency name for screen readers', () => {
    expect(plain(accessibleMoney(128462, 'EUR'))).toBe('1.284,62 euro');
  });

  it('says the amount is hidden in privacy mode', () => {
    expect(accessibleMoney(128462, 'EUR', { masked: true })).toBe('importo nascosto');
  });
});
