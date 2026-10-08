import { formatMultiple, formatPercent, formatShare } from './numbers';

const plain = (text: string) => text.replace(/ | /g, ' ');

describe('formatPercent', () => {
  it('writes an absolute ratio with one decimal, Italian style', () => {
    expect(plain(formatPercent(-0.124))).toBe('12,4%');
    expect(plain(formatPercent(0.08))).toBe('8,0%');
  });
});

describe('formatShare', () => {
  it('rounds a share to a whole percentage', () => {
    expect(formatShare(0.234)).toBe('23%');
    expect(formatShare(1)).toBe('100%');
  });

  it('never shows a real share as zero', () => {
    expect(formatShare(0.003)).toBe("meno dell'1%");
    expect(formatShare(0)).toBe('0%');
  });
});

describe('formatMultiple', () => {
  it('writes how many times, with at most one decimal', () => {
    expect(formatMultiple(2.345)).toBe('2,3');
    expect(formatMultiple(2)).toBe('2');
  });

  it('stops counting at ten', () => {
    expect(formatMultiple(10)).toBe('oltre 10');
    expect(formatMultiple(36.6)).toBe('oltre 10');
  });
});
