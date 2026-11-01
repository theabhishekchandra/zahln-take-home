import { businessDay } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, Avatar, IconButton, initials, SegmentedControl, useTheme } from '@zahln/ui-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Shift } from '@/lib/shift';

export type TillSection = 'sale' | 'refunds';

export interface TillHeaderProps {
  readonly shift: Shift;
  readonly section: TillSection;
  /** Omitted while switching would leave something unfinished, e.g. a refund being checked. */
  readonly onSection?: (section: TillSection) => void;
  readonly online: boolean;
  readonly onSignOut: () => void;
}

/** Wordmark, where this till is, whether it reaches Zahln, and who is signed in. */
export function TillHeader({ shift, section, onSection, online, onSignOut }: TillHeaderProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const insets = useSafeAreaInsets();
  const status = online
    ? { fill: theme.colors.successTint, ink: theme.colors.success, label: t('till.header.online') }
    : { fill: theme.colors.dangerTint, ink: theme.colors.danger, label: t('till.header.offline') };
  return (
    <View
      style={{
        minHeight: 76 + insets.top,
        paddingTop: insets.top,
        paddingLeft: insets.left + theme.spacing[6],
        paddingRight: insets.right + theme.spacing[6],
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing[4],
        backgroundColor: theme.colors.surfaceRaised,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.disabledFill,
      }}>
      <AppText variant="titleS" tone="brand" style={{ fontSize: 22 }} accessibilityRole="header">
        {t('common.appName')}
      </AppText>
      <View style={{ width: 1, height: 28, backgroundColor: theme.colors.disabledFill }} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" style={{ fontSize: 15 }}>
          {t('till.header.place', { mensa: shift.login.mensaName, till: shift.login.tillName })}
        </AppText>
        <AppText variant="caption" tone="muted">
          {format.day(businessDay(new Date()))}
        </AppText>
      </View>
      {onSection ? (
        <SegmentedControl
          role="tablist"
          size="large"
          accessibilityLabel={t('till.header.sections')}
          selected={section}
          onSelect={onSection}
          options={[
            { value: 'sale', label: t('till.header.takePayment') },
            { value: 'refunds', label: t('till.header.refunds') },
          ]}
        />
      ) : null}
      <View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={status.label}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingHorizontal: 14, borderRadius: theme.radius.pill, backgroundColor: status.fill }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: status.ink }} />
        <AppText variant="bodyStrong" style={{ color: status.ink, fontSize: 14 }}>
          {status.label}
        </AppText>
      </View>
      <View accessible accessibilityLabel={t('till.header.cashier', { name: shift.cashier.name })}>
        <Avatar initials={initials(shift.cashier.name)} shape="circle" size={42} selected />
      </View>
      <IconButton icon="signOut" accessibilityLabel={t('till.header.signOut')} onPress={onSignOut} />
    </View>
  );
}
