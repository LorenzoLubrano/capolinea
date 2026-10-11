import { Keyboard, Platform } from 'react-native';
import { create } from 'zustand';

interface KeypadState {
  /** The amount is done: the keypad folds away and the form below it gets the room. */
  folded: boolean;
  /** The system keyboard on Android, which covers the sheet instead of resizing it. 0 when closed. */
  keyboardHeight: number;
  /** Moving on from the amount: a category, Dettagli, a text field. */
  fold: () => void;
  /** A tap on the amount, and every form as it opens. */
  unfold: () => void;
  keyboardChanged: (height: number) => void;
}

export const useKeypad = create<KeypadState>((set) => ({
  folded: false,
  keyboardHeight: 0,
  fold: () => set({ folded: true }),
  unfold: () => set({ folded: false }),
  keyboardChanged: (keyboardHeight) => set({ keyboardHeight }),
}));

// For the whole session: the keyboard can close on a screen without a keypad (Back, a tap outside).
if (Platform.OS === 'android') {
  Keyboard.addListener('keyboardDidShow', (e) => useKeypad.getState().keyboardChanged(e.endCoordinates.height));
  Keyboard.addListener('keyboardDidHide', () => useKeypad.getState().keyboardChanged(0));
}
