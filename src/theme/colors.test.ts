import { mix } from './colors';

describe('mix', () => {
  it('lays a colour over another at the given opacity', () => {
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
  });

  it('returns the background at zero and the colour at full opacity', () => {
    expect(mix('#1C5DAE', '#FAFAF8', 0)).toBe('#fafaf8');
    expect(mix('#1C5DAE', '#FAFAF8', 1)).toBe('#1c5dae');
  });

  it('mixes each channel on its own', () => {
    expect(mix('#FF0000', '#0000FF', 0.25)).toBe('#4000bf');
  });
});
