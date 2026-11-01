import { formatCountdown } from '@zahln/i18n';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppText } from './AppText';
import { useTheme } from './theme';

export interface CountdownRingProps {
  /** Seconds left, e.g. from `useCountdown`. */
  readonly seconds: number;
  readonly totalSeconds: number;
  /** "Code valid for 1 minute 24 seconds". Read on focus, never interrupting. */
  readonly accessibilityLabel: string;
  readonly size?: number;
}

const STROKE = 8;

/** A ring that empties as a code runs out, with the time left in the middle. */
export function CountdownRing({ seconds, totalSeconds, accessibilityLabel, size = 78 }: CountdownRingProps) {
  const theme = useTheme();
  const r = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const left = totalSeconds > 0 ? Math.min(1, Math.max(0, seconds / totalSeconds)) : 0;
  return (
    <View accessible accessibilityRole="timer" accessibilityLabel={accessibilityLabel} style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.colors.disabledFill} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={theme.colors.brand}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - left)}
        />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="bodyStrong" style={{ fontSize: 17, fontVariant: ['tabular-nums'] }} maxFontSizeMultiplier={1.2}>
          {formatCountdown(seconds)}
        </AppText>
      </View>
    </View>
  );
}
