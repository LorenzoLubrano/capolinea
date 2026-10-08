import { pinProblem } from './pin';

describe('pinProblem', () => {
  it('accepts 4 to 6 digits that are not easy to guess', () => {
    expect(pinProblem('4071')).toBeNull();
    expect(pinProblem('905318')).toBeNull();
  });

  it('wants 4 to 6 digits and nothing else', () => {
    expect(pinProblem('123')).toBe('length');
    expect(pinProblem('1234567')).toBe('length');
    expect(pinProblem('12a4')).toBe('digits');
  });

  it('refuses repeated digits, straight runs and repeated pairs', () => {
    for (const pin of ['0000', '111111', '1234', '4321', '345678', '987654', '0123', '1212', '696969']) {
      expect(pinProblem(pin)).toBe('weak');
    }
  });
});
