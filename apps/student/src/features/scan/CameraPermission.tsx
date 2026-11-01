import { useTranslation } from '@zahln/i18n';
import { AppText, Button, Icon, IconButton, Screen, useTheme } from '@zahln/ui-native';
import * as Linking from 'expo-linking';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface CameraPermissionProps {
  /** False once the student said no and the OS won't ask again: only Settings can turn it on. */
  readonly canAsk: boolean;
  readonly onAllow: () => void;
  readonly onEnterCode: () => void;
  readonly onClose: () => void;
}

/** Design screen 04: why the camera is needed, before the OS asks. */
export function CameraPermission({ canAsk, onAllow, onEnterCode, onClose }: CameraPermissionProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const point = (text: string) => (
    <View style={{ flexDirection: 'row', gap: theme.spacing[3], alignItems: 'flex-start' }}>
      <Icon name="tick" size={20} strokeWidth={2.6} color={theme.colors.brand} />
      <AppText style={{ flex: 1 }}>{text}</AppText>
    </View>
  );
  return (
    <Screen
      scroll
      footer={
        canAsk ? (
          <>
            <Button label={t('permission.allow')} onPress={onAllow} />
            <Button label={t('permission.notNow')} variant="text" onPress={onEnterCode} />
          </>
        ) : (
          <>
            <Button label={t('permission.openSettings')} onPress={() => void Linking.openSettings()} />
            <Button label={t('scan.enterCode')} variant="text" onPress={onEnterCode} />
          </>
        )
      }>
      <View style={{ alignItems: 'center', marginTop: 56, gap: theme.spacing[4] }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 28,
            backgroundColor: theme.colors.brandTint,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name="camera" size={40} strokeWidth={1.8} color={theme.colors.brand} />
        </View>
        <AppText variant="titleM" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {t('permission.title')}
        </AppText>
        <AppText tone="secondary" style={{ textAlign: 'center' }}>
          {canAsk ? t('permission.body') : t('permission.denied')}
        </AppText>
      </View>
      {canAsk ? (
        <View style={{ gap: theme.spacing[3], marginTop: theme.spacing[4] }}>
          {point(t('permission.pointNoPhotos'))}
          {point(t('permission.pointTurnsOff'))}
        </View>
      ) : null}
      {/* Last in the tree so screen readers reach it after the explanation. */}
      <View style={{ position: 'absolute', top: insets.top + theme.spacing[2], left: theme.spacing[5] }}>
        <IconButton icon="close" accessibilityLabel={t('scan.close')} onPress={onClose} />
      </View>
    </Screen>
  );
}
