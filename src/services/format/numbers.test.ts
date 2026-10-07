import { formatPercent } from './numbers';

const plain = (text: string) => text.replace(/ | /g, ' ');

describe('formatPercent', () => {
  it('writes an absolute ratio with one decimal, Italian style', () => {
    expect(plain(formatPercent(-0.124))).toBe('12,4%');
    expect(plain(formatPercent(0.08))).toBe('8,0%');
  });
});
