import { csvAmount, csvCell, csvLine } from './csv';

describe('csvCell', () => {
  it('leaves plain text alone', () => {
    expect(csvCell('Esselunga')).toBe('Esselunga');
    expect(csvCell('')).toBe('');
  });

  it('quotes text with separators, quotes or line breaks, doubling the quotes', () => {
    expect(csvCell('Pane; latte')).toBe('"Pane; latte"');
    expect(csvCell('Il "solito" bar')).toBe('"Il ""solito"" bar"');
    expect(csvCell('riga uno\nriga due')).toBe('"riga uno\nriga due"');
  });

  it('defuses text a spreadsheet would run as a formula', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell('+39 333')).toBe("'+39 333");
    expect(csvCell('-sconto')).toBe("'-sconto");
    expect(csvCell('@nota')).toBe("'@nota");
  });
});

describe('csvAmount', () => {
  it('writes cents with a decimal comma, sign included, no grouping', () => {
    expect(csvAmount(-128462)).toBe('-1284,62');
    expect(csvAmount(500)).toBe('5,00');
    expect(csvAmount(-7)).toBe('-0,07');
  });
});

describe('csvLine', () => {
  it('joins cells with semicolons, as spreadsheets in Italian expect', () => {
    expect(csvLine(['2026-10-24', 'Spesa', '-12,50'])).toBe('2026-10-24;Spesa;-12,50');
  });
});
