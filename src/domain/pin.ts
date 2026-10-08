/** Why a PIN cannot be used: length, non-digits, or too easy to guess. */
export type PinProblem = 'length' | 'digits' | 'weak';

/**
 * A PIN must be 4 to 6 digits and not one of the guesses tried first: one repeated digit, a straight
 * run up or down, or a repeated pair.
 */
export function pinProblem(pin: string): PinProblem | null {
  if (pin.length < 4 || pin.length > 6) return 'length';
  if (!/^\d+$/.test(pin)) return 'digits';
  const digits = [...pin].map(Number);
  const steps = digits.slice(1).map((d, i) => d - digits[i]);
  const straight = steps.every((s) => s === steps[0]) && Math.abs(steps[0]) <= 1;
  const pairs = pin.length % 2 === 0 && pin === pin.slice(0, 2).repeat(pin.length / 2);
  return straight || pairs ? 'weak' : null;
}
