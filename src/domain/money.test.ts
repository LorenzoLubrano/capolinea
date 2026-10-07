import { appendKeypadKey, cleanAmountText, inputToMinor, minorToInput } from './money';

describe('appendKeypadKey', () => {
  const type = (keys: string[]) => keys.reduce((input, key) => appendKeypadKey(input, key as never), '');

  it('builds an amount from digits and a decimal comma', () => {
    expect(type(['1', '8', ',', '9', '0'])).toBe('18,90');
  });

  it('starts with 0, when the comma comes first', () => {
    expect(type([','])).toBe('0,');
  });

  it('keeps at most two decimals', () => {
    expect(type(['5', ',', '9', '0', '1'])).toBe('5,90');
  });

  it('accepts a single comma', () => {
    expect(type(['5', ',', ','])).toBe('5,');
  });

  it('drops a leading zero', () => {
    expect(type(['0', '7'])).toBe('7');
    expect(type(['0', '0'])).toBe('0');
  });

  it('caps the integer part at 7 digits', () => {
    expect(type(['1', '2', '3', '4', '5', '6', '7', '8'])).toBe('1234567');
  });

  it('deletes the last character with backspace', () => {
    expect(appendKeypadKey('5,90', 'backspace')).toBe('5,9');
    expect(appendKeypadKey('', 'backspace')).toBe('');
  });
});

describe('inputToMinor', () => {
  it('converts keypad input to cents', () => {
    expect(inputToMinor('18,90')).toBe(1890);
    expect(inputToMinor('18,9')).toBe(1890);
    expect(inputToMinor('5,')).toBe(500);
    expect(inputToMinor('0,05')).toBe(5);
    expect(inputToMinor('1234567')).toBe(123456700);
  });

  it('returns 0 for an empty input', () => {
    expect(inputToMinor('')).toBe(0);
  });
});

describe('minorToInput', () => {
  it('shows cents only when present', () => {
    expect(minorToInput(1890)).toBe('18,90');
    expect(minorToInput(1800)).toBe('18');
    expect(minorToInput(5)).toBe('0,05');
  });

  it('round-trips through inputToMinor', () => {
    for (const minor of [0, 1, 99, 150, 4280, 128462]) {
      expect(inputToMinor(minorToInput(minor))).toBe(minor);
    }
  });
});

describe('cleanAmountText', () => {
  it('keeps digits and one decimal comma, two decimals at most', () => {
    expect(cleanAmountText('12.5')).toBe('12,5');
    expect(cleanAmountText('12,555')).toBe('12,55');
    expect(cleanAmountText('1,2,3')).toBe('1,2');
    expect(cleanAmountText('ab7c')).toBe('7');
    expect(cleanAmountText('')).toBe('');
  });
});
