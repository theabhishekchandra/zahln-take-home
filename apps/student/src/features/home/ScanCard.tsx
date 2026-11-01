import { useTranslation } from '@zahln/i18n';
import { AppText, Icon, useTheme } from '@zahln/ui-native';
import { Pressable, View } from 'react-native';

/** Why paying can't start right now. */
export type ScanOff = 'offline' | 'payments_disabled' | 'update_required';

/** The home screen's main action. Off while offline or paused by Zahln, with the reason in place of the hint. */
export function ScanCard({ off, onPress }: { readonly off: ScanOff | null; readonly onPress: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const online = off === null;
  const hint = {
    none: t('home.scanHint'),
    offline: t('offline.scanOff'),
    payments_disabled: t('gate.scanOffPaused'),
    update_required: t('gate.scanOffUpdate'),
  }[off ?? 'none'];
  const fill = online ? theme.colors.brand : theme.colors.disabledFill;
  const ink = online ? theme.colors.onBrand : theme.colors.disabledInk;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('home.scanTitle')}. ${hint}`}
      accessibilityState={{ disabled: !online }}
      disabled={!online}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[4],
        minHeight: 132,
        paddingHorizontal: 22,
        borderRadius: theme.radius.card,
        backgroundColor: online && pressed ? theme.colors.brandPressed : fill,
      })}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: theme.radius.card,
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={online ? 'scan' : off === 'offline' ? 'offline' : 'lock'} size={32} color={ink} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="titleS" style={{ color: ink, fontSize: 21 }}>
          {t('home.scanTitle')}
        </AppText>
        <AppText variant="caption" style={{ color: ink, fontSize: 14, opacity: 0.9 }}>
          {hint}
        </AppText>
      </View>
      {online ? <Icon name="chevronRight" size={20} strokeWidth={2.2} color={ink} /> : null}
    </Pressable>
  );
}
