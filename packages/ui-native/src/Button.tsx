import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { hero } from '@zahln/ui-tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { useTheme, type Theme } from './theme';
import { useReduceMotion } from './useReduceMotion';

/**
 * `onHero`: the primary action on the deep-brand result screen (white fill, brand label), in both schemes.
 * `textDestructive`: a red text button for throwing something away, e.g. clearing the till's order.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'textDestructive' | 'destructive' | 'onHero';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  readonly label: string;
  readonly variant?: ButtonVariant;
  /**
   * Primary only. Locks the button and shows `loadingLabel` with a spinner. A second
   * tap does nothing: the flow, not the button, decides when it unlocks.
   */
  readonly loading?: boolean;
  readonly loadingLabel?: string;
  /** Shown directly above a disabled button, so it is never disabled without a reason. */
  readonly disabledReason?: string;
  /** `large`: the till's counter buttons, 72 dp primary and 64 dp grey-filled secondary. */
  readonly size?: 'regular' | 'large';
  /** Before the label, e.g. the QR on "Show QR". */
  readonly icon?: IconName;
}

function colorsFor(theme: Theme, variant: ButtonVariant, pressed: boolean, inactive: boolean, large: boolean) {
  const c = theme.colors;
  if (large && variant === 'secondary' && !inactive)
    return { background: pressed ? c.lineDisabled : c.disabledFill, foreground: c.ink, border: undefined };
  if (variant === 'primary') {
    if (inactive) return { background: c.disabledFill, foreground: c.disabledInk, border: undefined };
    return { background: pressed ? c.brandPressed : c.brand, foreground: c.onBrand, border: undefined };
  }
  if (variant === 'onHero') return { background: pressed ? hero.inkMuted : hero.ink, foreground: hero.ground, border: undefined };
  if (inactive)
    return {
      background: 'transparent',
      foreground: c.inkMuted,
      border: variant === 'text' || variant === 'textDestructive' ? undefined : c.lineDisabled,
    };
  if (variant === 'textDestructive') return { background: pressed ? c.dangerTint : 'transparent', foreground: c.danger, border: undefined };
  if (variant === 'secondary') return { background: pressed ? c.pressed : 'transparent', foreground: c.ink, border: c.line };
  if (variant === 'destructive') return { background: pressed ? c.dangerTint : 'transparent', foreground: c.danger, border: c.danger };
  return { background: pressed ? c.brandTint : 'transparent', foreground: c.brand, border: undefined };
}

/** One primary button per screen. Primary is 56 dp high, the others 48 dp; `large` 72 and 64 dp. */
export function Button({
  label,
  variant = 'primary',
  loading = false,
  loadingLabel,
  disabledReason,
  disabled,
  size = 'regular',
  icon,
  ...props
}: ButtonProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const busy = variant === 'primary' && loading;
  const inactive = Boolean(disabled) && !busy;
  const shownLabel = busy && loadingLabel ? loadingLabel : label;
  const large = size === 'large';
  const prominent = variant === 'primary' || variant === 'onHero';
  const height = large ? (prominent ? 72 : 64) : prominent ? theme.size.primaryButton : theme.size.tapMin;

  return (
    <View style={{ gap: theme.spacing[2], alignSelf: 'stretch' }}>
      {inactive && disabledReason ? (
        <AppText variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
          {disabledReason}
        </AppText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shownLabel}
        accessibilityHint={inactive ? disabledReason : undefined}
        accessibilityState={{ disabled: inactive || busy, busy }}
        disabled={inactive || busy}
        style={({ pressed }) => {
          const { background, border } = colorsFor(theme, variant, pressed, inactive, large);
          return {
            minHeight: height,
            paddingHorizontal: theme.spacing[5],
            borderRadius: large ? 20 : theme.radius.control,
            flexDirection: 'row',
            gap: theme.spacing[3],
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: background,
            borderWidth: border ? 1 : 0,
            borderColor: border,
            opacity: busy ? 0.85 : 1,
            // Always an array: going from a transform back to none crashes React Native 0.88 on Android.
            transform: [{ scale: pressed && !reduceMotion ? 0.98 : 1 }],
          };
        }}
        {...props}>
        {({ pressed }) => {
          const { foreground } = colorsFor(theme, variant, pressed, inactive, large);
          return (
            <>
              {busy ? (
                <ActivityIndicator color={foreground} size="small" />
              ) : icon ? (
                <Icon name={icon} size={large ? 26 : 20} color={foreground} />
              ) : null}
              <AppText
                variant="button"
                style={{ color: foreground, textAlign: 'center', ...(large ? { fontSize: prominent ? 19 : 17, lineHeight: 26 } : null) }}>
                {shownLabel}
              </AppText>
            </>
          );
        }}
      </Pressable>
    </View>
  );
}
