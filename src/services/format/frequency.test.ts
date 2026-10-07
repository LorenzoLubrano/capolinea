import { frequencyLabel } from './frequency';

describe('frequencyLabel', () => {
  it('says every week, month or year', () => {
    expect(frequencyLabel({ unit: 'week', interval: 1 })).toBe('Ogni settimana');
    expect(frequencyLabel({ unit: 'month', interval: 1 })).toBe('Ogni mese');
    expect(frequencyLabel({ unit: 'year', interval: 1 })).toBe('Ogni anno');
  });

  it('counts longer intervals', () => {
    expect(frequencyLabel({ unit: 'week', interval: 2 })).toBe('Ogni 2 settimane');
    expect(frequencyLabel({ unit: 'month', interval: 3 })).toBe('Ogni 3 mesi');
    expect(frequencyLabel({ unit: 'year', interval: 2 })).toBe('Ogni 2 anni');
  });
});
