import type { Colors } from '@zahln/ui-tokens';
import { View } from 'react-native';

import { AppText, type TextTone } from './AppText';
import { Icon, type IconName } from './Icon';
import { useTheme } from './theme';

export type StatusKind = 'paid' | 'checking' | 'declined' | 'refunded';

const look: Readonly<Record<StatusKind, { icon: IconName; tone: TextTone; color: keyof Colors }>> = {
  paid: { icon: 'check', tone: 'success', color: 'success' },
  checking: { icon: 'clock', tone: 'pending', color: 'pending' },
  declined: { icon: 'cross', tone: 'danger', color: 'danger' },
  refunded: { icon: 'refund', tone: 'secondary', color: 'inkSecondary' },
};

/**
 * Payment status as a word plus an icon, never colour alone. "checking" is an unknown
 * outcome and must never be styled as paid or as failed.
 */
export function StatusLabel({ kind, label }: { readonly kind: StatusKind; readonly label: string }) {
  const theme = useTheme();
  const { icon, tone, color } = look[kind];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1] }}>
      <Icon name={icon} size={14} strokeWidth={2.4} color={theme.colors[color]} />
      <AppText variant="label" tone={tone}>
        {label}
      </AppText>
    </View>
  );
}
