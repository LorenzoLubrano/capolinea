import { useDiscardPrompt } from './discard-prompt';

describe('useDiscardPrompt', () => {
  beforeEach(() => useDiscardPrompt.setState({ pending: null }));

  it('leaves only on Scarta, and only once however often it is tapped', () => {
    const leave = jest.fn();
    useDiscardPrompt.getState().ask(leave);
    expect(useDiscardPrompt.getState().pending).not.toBeNull();

    useDiscardPrompt.getState().answer('discard');
    useDiscardPrompt.getState().answer('discard');
    expect(leave).toHaveBeenCalledTimes(1);
    expect(useDiscardPrompt.getState().pending).toBeNull();
  });

  it('keeps the sheet open on Continua a scrivere, Back or a tap outside', () => {
    const leave = jest.fn();
    useDiscardPrompt.getState().ask(leave);
    useDiscardPrompt.getState().answer('keep');
    expect(leave).not.toHaveBeenCalled();
    expect(useDiscardPrompt.getState().pending).toBeNull();
  });
});
