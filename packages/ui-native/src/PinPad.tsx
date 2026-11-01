import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { announce } from './announce';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { useTheme } from './theme';
import { useReduceMotion } from './useReduceMotion';

export interface PinDotsProps {
  readonly length: number;
  readonly filled: number;
  /** Red dots and one shake, e.g. after a wrong PIN. */
  readonly error?: boolean;
  /** "PIN, 2 of 4 digits entered". Digits themselves are never read out. */
  readonly accessibilityLabel: string;
}

export function PinDots({ length, filled, error = false, accessibilityLabel }: PinDotsProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!error || reduceMotion) return;
    const step = (to: number) => Animated.timing(offset, { toValue: to, duration: 75, useNativeDriver: true });
    Animated.sequence([step(-10), step(10), step(-6), step(6), step(0)]).start();
  }, [error, reduceMotion, offset]);

  // A digit's button says nothing once pressed, so say how far along the PIN is. Not when it empties after a check.
  useEffect(() => {
    if (filled > 0) announce(accessibilityLabel);
  }, [filled, accessibilityLabel]);

  return (
    <Animated.View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', gap: 20, transform: [{ translateX: offset }] }}>
      {Array.from({ length }, (_, index) => {
        const on = index < filled && !error;
        return (
          <View
            key={index}
            style={{
              width: 16,
              height: 16,
              borderRadius: theme.radius.pill,
              backgroundColor: on ? theme.colors.brand : 'transparent',
              borderWidth: on ? 0 : 2,
              borderColor: error ? theme.colors.danger : theme.colors.line,
            }}
          />
        );
      })}
    </Animated.View>
  );
}

export interface PinPadProps {
  readonly onDigit: (digit: string) => void;
  readonly onDelete: () => void;
  readonly deleteLabel: string;
  /** Shows the fingerprint key bottom left when biometrics can be used instead. */
  readonly onBiometrics?: () => void;
  readonly biometricsLabel?: string;
  /** A text key bottom left instead, e.g. "Other cashier" on the till. */
  readonly textKey?: { readonly label: string; readonly onPress: () => void };
  /** `round`: 68 dp circles on the phone. `tile`: filled keys filling the width, on the till. */
  readonly look?: 'round' | 'tile';
  readonly disabled?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
const ROUND = 68;
const TILE_HEIGHT = 56;

/** 3 × 4 keypad. Digits are buttons; their value is never announced back. */
export function PinPad({ onDigit, onDelete, deleteLabel, onBiometrics, biometricsLabel, textKey, look = 'round', disabled = false }: PinPadProps) {
  const theme = useTheme();
  const tile = look === 'tile';
  const keySize = tile ? { flexBasis: '30%' as const, flexGrow: 1, height: TILE_HEIGHT } : { width: ROUND, height: ROUND };
  const key = (content: React.ReactNode, onPress: () => void, label: string, filled = tile) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        ...keySize,
        borderRadius: tile ? theme.radius.control : theme.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? (pressed ? theme.colors.disabledFill : theme.colors.pressed) : pressed ? theme.colors.pressed : 'transparent',
        opacity: disabled ? 0.4 : 1,
      })}>
      {content}
    </Pressable>
  );
  const digit = (d: string) =>
    key(
      <AppText variant="titleM" style={tile ? { fontSize: 22, lineHeight: 28 } : { fontSize: 28, lineHeight: 34 }} maxFontSizeMultiplier={1.3}>
        {d}
      </AppText>,
      () => onDigit(d),
      d,
    );
  const bottomLeft = () => {
    if (textKey) {
      return key(
        <AppText variant="label" tone="brand" style={{ textAlign: 'center', fontSize: 13 }} maxFontSizeMultiplier={1.3}>
          {textKey.label}
        </AppText>,
        textKey.onPress,
        textKey.label,
        false,
      );
    }
    if (onBiometrics && biometricsLabel) {
      return key(<Icon name="fingerprint" size={30} strokeWidth={1.8} color={theme.colors.brand} />, onBiometrics, biometricsLabel);
    }
    return <View style={keySize} />;
  };

  return (
    <View
      style={
        tile
          ? { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2], alignSelf: 'stretch' }
          : { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, width: 260, alignSelf: 'center' }
      }>
      {KEYS.map(digit)}
      {bottomLeft()}
      {digit('0')}
      {key(<Icon name="backspace" size={tile ? 24 : 28} strokeWidth={1.8} color={theme.colors.ink} />, onDelete, deleteLabel)}
    </View>
  );
}
