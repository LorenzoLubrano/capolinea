import { knownIcon } from './icon';

describe('knownIcon', () => {
  it('draws an unknown icon, even one named like a built-in of every object, as the fallback', () => {
    expect(knownIcon('Wallet')).toBe('Wallet');
    for (const name of ['NonEsiste', '__proto__', 'constructor', 'valueOf', 'toString']) {
      expect(knownIcon(name)).toBe('DotsThree');
    }
  });
});
