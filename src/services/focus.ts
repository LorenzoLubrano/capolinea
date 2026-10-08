import { useIsFocused } from 'expo-router';
import { useState } from 'react';

/**
 * The value as it was when the screen last had focus. A save from a sheet changes the data while
 * the sheet still covers the screen: holding it back makes the change, and its motion, happen
 * once the screen is in view again.
 */
export function useHeldWhileBlurred<T>(value: T): T {
  const focused = useIsFocused();
  const [held, setHeld] = useState(value);
  // Updated during render, as React suggests for state that follows a prop: no extra commit.
  if (focused && held !== value) setHeld(value);
  return focused ? value : held;
}
