import { accessibleMoney, formatMoney, speakable } from './money';

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

describe('speakable', () => {
  it('reads hidden amounts as hidden, wherever they sit in a sentence', () => {
    const hidden = formatMoney(1234, 'EUR', { masked: true });
    expect(speakable(`Speso ${hidden} su un budget di ${hidden}.`)).toBe('Speso importo nascosto su un budget di importo nascosto.');
    expect(speakable(`Ti devono ${formatMoney(1234, 'EUR', { masked: true, wholeUnits: true })}`)).toBe('Ti devono importo nascosto');
  });

  it('leaves visible amounts and plain text alone', () => {
    expect(speakable('Restano 307 €')).toBe('Restano 307 €');
  });
});

describe('accessibleMoney with a direction', () => {
  it('says which way the money went', () => {
    expect(accessibleMoney(1799, 'EUR', { kind: 'expense' })).toBe('uscita di 17,99 euro');
    expect(accessibleMoney(32000, 'EUR', { kind: 'refund' })).toBe('rimborso di 320,00 euro');
    expect(accessibleMoney(175000, 'EUR', { kind: 'income', masked: true })).toBe('entrata di importo nascosto');
  });
});
