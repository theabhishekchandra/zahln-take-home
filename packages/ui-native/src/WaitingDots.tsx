import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';

import { useReduceMotion } from './useReduceMotion';

/** Three dots that pulse in turn: still waiting. Decorative; still with reduced motion. */
export function WaitingDots({ color }: { readonly color: string }) {
  const reduceMotion = useReduceMotion();
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0.3)));
  useEffect(() => {
    if (reduceMotion) return;
    const pulse = Animated.loop(
      Animated.stagger(
        180,
        dots.map((dot) =>
          Animated.sequence([
            Animated.timing(dot, { toValue: 1, duration: 360, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0.3, duration: 360, useNativeDriver: true }),
          ]),
        ),
      ),
    );
    pulse.start();
    return () => pulse.stop();
  }, [dots, reduceMotion]);
  return (
    <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ flexDirection: 'row', gap: 6 }}>
      {dots.map((opacity, index) => (
        <Animated.View key={index} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity }} />
      ))}
    </View>
  );
}
