import { comparisonLine } from './words';

const plain = (text: string) => text.replace(/ | /g, ' ');

describe('comparisonLine', () => {
  it('compares with the same day of last month in percent', () => {
    expect(plain(comparisonLine(-0.08, 'settembre'))).toBe('8,0% in meno di settembre allo stesso giorno');
    expect(plain(comparisonLine(0.25, 'settembre'))).toBe('25,0% in più di settembre allo stesso giorno');
  });

  it('says how many times from double upwards', () => {
    expect(comparisonLine(1.4, 'settembre')).toBe('2,4 volte rispetto a settembre allo stesso giorno');
    expect(comparisonLine(35.565, 'settembre')).toBe('Oltre 10 volte rispetto a settembre allo stesso giorno');
  });

  it('calls a tiny change the same, and says when there is nothing to compare', () => {
    expect(comparisonLine(0.001, 'settembre')).toBe('Come settembre allo stesso giorno');
    expect(comparisonLine(null, 'settembre')).toBe('Nessun confronto: il mese scorso è vuoto');
  });
});
