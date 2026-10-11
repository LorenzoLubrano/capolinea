import { useKeypad } from './keypad';

describe('useKeypad', () => {
  beforeEach(() => useKeypad.setState({ folded: false, keyboardHeight: 0 }));

  it('folds away once the amount is done, and a tap on the amount brings it back', () => {
    useKeypad.getState().fold();
    expect(useKeypad.getState().folded).toBe(true);
    useKeypad.getState().unfold();
    expect(useKeypad.getState().folded).toBe(false);
  });

  it('keeps the height of the system keyboard, so the save button can sit above it', () => {
    useKeypad.getState().keyboardChanged(812);
    expect(useKeypad.getState().keyboardHeight).toBe(812);
    useKeypad.getState().keyboardChanged(0);
    expect(useKeypad.getState().keyboardHeight).toBe(0);
  });
});
