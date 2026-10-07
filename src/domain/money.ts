/**
 * Amount entry for the custom keypad. The input string uses the Italian decimal comma
 * and is converted to integer cents only when saved.
 */

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | ',' | 'backspace';

const MAX_INTEGER_DIGITS = 7;
const MAX_DECIMALS = 2;

export function appendKeypadKey(input: string, key: KeypadKey): string {
  if (key === 'backspace') return input.slice(0, -1);

  const [integer, decimals] = input.split(',');
  const hasComma = decimals !== undefined;

  if (key === ',') {
    if (hasComma) return input;
    return `${integer === '' ? '0' : integer},`;
  }

  if (hasComma) {
    return decimals.length < MAX_DECIMALS ? input + key : input;
  }
  if (integer === '0') return key;
  return integer.length < MAX_INTEGER_DIGITS ? input + key : input;
}

export function inputToMinor(input: string): number {
  if (input === '') return 0;
  const [integer, decimals = ''] = input.split(',');
  return Number(integer || '0') * 100 + Number(decimals.padEnd(MAX_DECIMALS, '0'));
}

export function minorToInput(minor: number): string {
  const integer = Math.floor(minor / 100);
  const cents = minor % 100;
  return cents === 0 ? String(integer) : `${integer},${String(cents).padStart(2, '0')}`;
}
