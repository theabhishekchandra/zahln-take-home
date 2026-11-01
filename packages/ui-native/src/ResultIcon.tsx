import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import { Icon, type IconName } from './Icon';
import { useTheme } from './theme';
import { useReduceMotion } from './useReduceMotion';

export interface ResultIconProps {
  readonly icon: IconName;
  readonly color: string;
  readonly background: string;
  readonly size?: number;
}

/** The big round icon on a result screen. Pops in once (450 ms); no motion with "remove animations". */
export function ResultIcon({ icon, color, background, size = 96 }: ResultIconProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(reduceMotion ? 1 : 0.3)).current;
  useEffect(() => {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
  }, [reduceMotion, scale]);
  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.pill,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        transform: [{ scale }],
      }}>
      <Icon name={icon} size={size * 0.54} strokeWidth={3} color={color} />
    </Animated.View>
  );
}
