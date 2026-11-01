import { useTranslation } from '@zahln/i18n';
import { AppText, Icon, useTheme } from '@zahln/ui-native';
import { View } from 'react-native';

/** T13: QR payments are paused, and resume by themselves when the till is back online. */
export function OfflineBanner() {
  const theme = useTheme();
  const { t } = useTranslation();
  const ink = theme.colors.surfaceRaised;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[4], backgroundColor: theme.colors.ink, paddingVertical: 14, paddingHorizontal: theme.spacing[6] }}>
      <Icon name="offline" size={24} color={ink} />
      <AppText style={{ flex: 1, color: ink }}>
        <AppText variant="bodyStrong" style={{ color: ink }}>
          {t('till.offline.title')}
        </AppText>{' '}
        {t('till.offline.body')}
      </AppText>
    </View>
  );
}
