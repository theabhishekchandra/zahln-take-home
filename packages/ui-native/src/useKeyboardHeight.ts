import { useEffect, useState } from 'react';
import { Dimensions, Keyboard } from 'react-native';

/**
 * How much of the bottom of the window the on-screen keyboard covers, 0 while it's hidden.
 * Edge to edge, Android no longer shrinks the window for the keyboard, so a screen pads
 * itself by this much instead. Measured from the keyboard's top edge: on Android the
 * reported height leaves out the navigation bar below it.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (event) =>
      setHeight(Math.max(0, Dimensions.get('window').height - event.endCoordinates.screenY)),
    );
    const hidden = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return height;
}
