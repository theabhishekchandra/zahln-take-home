import { announce, AppText, ResultIcon, Screen, useTheme, type IconName } from '@zahln/ui-native';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';

export interface ResultLayoutProps {
  readonly icon: IconName;
  readonly tone: 'pending' | 'danger';
  readonly title: string;
  readonly body?: string;
  /** Spoken once when the result appears, e.g. "Declined. Nothing was charged." */
  readonly spoken: string;
  readonly children?: ReactNode;
  readonly footer: ReactNode;
}

/** A payment outcome that is not "paid": what happened, whether money moved, the one next step. */
export function ResultLayout({ icon, tone, title, body, spoken, children, footer }: ResultLayoutProps) {
  const theme = useTheme();
  useEffect(() => announce(spoken), [spoken]);
  const color = tone === 'pending' ? theme.colors.pending : theme.colors.danger;
  const background = tone === 'pending' ? theme.colors.pendingTint : theme.colors.dangerTint;
  return (
    <Screen scroll footer={footer}>
      <View style={{ alignItems: 'center', gap: theme.spacing[3], marginTop: 56 }}>
        <ResultIcon icon={icon} color={color} background={background} size={88} />
        <AppText variant="titleM" accessibilityRole="header" style={{ textAlign: 'center', marginTop: theme.spacing[2] }}>
          {title}
        </AppText>
        {body ? (
          <AppText tone="secondary" style={{ textAlign: 'center' }}>
            {body}
          </AppText>
        ) : null}
      </View>
      {children}
    </Screen>
  );
}
