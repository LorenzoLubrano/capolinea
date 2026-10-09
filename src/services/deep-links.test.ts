import { redirectSystemPath } from './deep-links';

describe('links from outside the app', () => {
  it('opens nothing while the app runs: a link must not reach a screen behind the lock', () => {
    for (const path of ['capolinea://settings/export', 'capolinea://settings/pin', 'capolinea:///', '/transaction/abc']) {
      expect(redirectSystemPath({ path, initial: false })).toBeNull();
    }
  });

  it('starts the app on its first screen, whatever link opened it', () => {
    expect(redirectSystemPath({ path: 'capolinea://settings/export', initial: true })).toBe('/');
  });
});
