import { PIN_LENGTH } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { AppText, Icon, PinDots, PinPad, useTheme, type usePinInput } from '@zahln/ui-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface PinLayoutProps {
  readonly input: ReturnType<typeof usePinInput>;
  readonly title: string;
  /** Row above the lock tile: back button and context such as "€5.30 · Mensa Zentral". */
  readonly header?: ReactNode;
  /** Rules, the error line, the lock notice. */
  readonly children?: ReactNode;
  readonly disabled?: boolean;
  readonly onBiometrics?: () => void;
  /** In place of the lock tile, e.g. "Identity confirmed with fingerprint". */
  readonly badge?: ReactNode;
  /** Under the keypad: what happens next. */
  readonly footnote?: string;
}

/** The PIN screens' shared layout (design screens 08 and 28): lock tile, title, messages, dots, keypad. */
export function PinLayout({ input, title, header, children, disabled = false, onBiometrics, badge, footnote }: PinLayoutProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.surfaceRaised,
        alignItems: 'center',
        paddingTop: insets.top + theme.spacing[2],
        paddingBottom: insets.bottom + theme.spacing[6],
        paddingHorizontal: 28,
      }}>
      <View style={{ alignSelf: 'stretch', minHeight: theme.size.tapMin }}>{header}</View>
      {badge ? (
        <View style={{ marginTop: theme.spacing[6] }}>{badge}</View>
      ) : (
        <View
          style={{
            marginTop: theme.spacing[6],
            width: 56,
            height: 56,
            borderRadius: theme.radius.control,
            backgroundColor: theme.colors.brandTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="lock" size={26} color={theme.colors.brand} />
        </View>
      )}
      <AppText variant="titleM" accessibilityRole="header" style={{ marginTop: theme.spacing[4], textAlign: 'center' }}>
        {title}
      </AppText>
      <View style={{ marginTop: theme.spacing[2], alignItems: 'center', gap: theme.spacing[1], alignSelf: 'stretch' }}>{children}</View>
      <View style={{ marginTop: 28 }}>
        <PinDots
          length={PIN_LENGTH}
          filled={input.digits.length}
          error={input.error}
          accessibilityLabel={t('pin.dots', { count: input.digits.length })}
        />
      </View>
      <View style={{ flex: 1, minHeight: theme.spacing[6] }} />
      <PinPad
        onDigit={input.add}
        onDelete={input.remove}
        deleteLabel={t('pin.delete')}
        onBiometrics={onBiometrics}
        biometricsLabel={t('pin.useBiometrics')}
        disabled={disabled || input.busy}
      />
      {footnote ? (
        // Two lines whatever it says, so the keypad stays put from one step to the next.
        <AppText variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: 14, minHeight: 2 * theme.typography.caption.lineHeight, textAlign: 'center' }}>
          {footnote}
        </AppText>
      ) : null}
    </View>
  );
}
