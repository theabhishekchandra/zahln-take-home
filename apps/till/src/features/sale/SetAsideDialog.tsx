import { useTranslation } from '@zahln/i18n';
import { AppText, Button, Icon, Overlay, useTheme } from '@zahln/ui-native';
import { View } from 'react-native';

export interface SetAsideDialogProps {
  readonly visible: boolean;
  readonly onKeep: () => void;
  readonly onConfirm: () => void;
}

/**
 * T8, as Zahln's API allows: an order can't be cancelled, only set aside. Its
 * code stays payable until it runs out, so the till keeps watching it and says
 * so if it's paid after all.
 */
export function SetAsideDialog({ visible, onKeep, onConfirm }: SetAsideDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Overlay visible={visible} placement="center" onRequestClose={onKeep}>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{ alignSelf: 'center', width: 72, height: 72, borderRadius: 22, backgroundColor: theme.colors.pendingTint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="clock" size={34} strokeWidth={2.6} color={theme.colors.pending} />
      </View>
      <AppText variant="titleL" accessibilityRole="header" style={{ textAlign: 'center' }}>
        {t('till.setAside.title')}
      </AppText>
      <AppText tone="secondary" style={{ fontSize: 17, lineHeight: 26, textAlign: 'center' }}>
        {t('till.setAside.body')}
      </AppText>
      <AppText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        {t('till.setAside.race')}
      </AppText>
      <View style={{ gap: theme.spacing[3] }}>
        <Button size="large" label={t('till.setAside.confirm')} onPress={onConfirm} />
        <Button size="large" variant="secondary" label={t('till.setAside.keep')} onPress={onKeep} />
      </View>
    </Overlay>
  );
}
