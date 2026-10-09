import { createDataset } from '@/data/mock/seed';

import { BACKUP_FORMAT, buildBackup, buildTransactionsCsv, exportFileName } from './export';

const data = createDataset();

describe('buildTransactionsCsv', () => {
  const csv = buildTransactionsCsv(data, { from: '2026-10-01', to: '2026-10-31' });
  const lines = csv.split('\r\n');

  it('has a header and one line per movement of the period, oldest first', () => {
    expect(lines[0]).toBe('Data;Tipo;Importo;Valuta;Conto;Conto di destinazione;Categoria;Esercente;Descrizione;Note;Etichette;Tua quota;Pagato da');
    const october = data.transactions.filter((t) => t.date >= '2026-10-01' && t.date <= '2026-10-31');
    expect(lines.length - 1).toBe(october.length);
    const dates = lines.slice(1).map((l) => l.slice(0, 10));
    expect([...dates].sort()).toEqual(dates);
  });

  it('signs amounts from the point of view of the account and adds the split details', () => {
    const rent = lines.find((l) => l.includes(';Affitto;'))!;
    expect(rent).toMatch(/^2026-10-01;Spesa;-550,00;EUR;Conto corrente;;Casa;Affitto;/);
    const salary = lines.find((l) => l.includes(';Stipendio;'))!;
    expect(salary).toMatch(/^2026-10-10;Entrata;1750,00;EUR;Conto corrente;;Stipendio;Stipendio;/);
    const dinner = lines.find((l) => l.includes('Cena con Mario'))!;
    expect(dinner.endsWith(';30,00;')).toBe(true);
  });

  it('exports everything without a range', () => {
    expect(buildTransactionsCsv(data, {}).split('\r\n').length - 1).toBe(data.transactions.length);
  });
});

describe('buildBackup', () => {
  it('is JSON with a format, a version and every collection, ready to be read back', () => {
    const text = buildBackup(data, '2026-10-24T18:00:00.000Z');
    const backup = JSON.parse(text);
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.version).toBe(1);
    expect(backup.exportedAt).toBe('2026-10-24T18:00:00.000Z');
    expect(backup.data.transactions).toHaveLength(data.transactions.length);
    expect(backup.data.accounts).toEqual(data.accounts);
    expect(Object.keys(backup.data).sort()).toEqual(['accounts', 'budgets', 'categories', 'currency', 'goals', 'meId', 'people', 'subscriptions', 'transactions']);
  });
});

describe('exportFileName', () => {
  it('dates the file so exports never overwrite each other', () => {
    expect(exportFileName('csv', '2026-10-24')).toBe('capolinea-movimenti-2026-10-24.csv');
    expect(exportFileName('backup', '2026-10-24')).toBe('capolinea-backup-2026-10-24.json');
  });
});
