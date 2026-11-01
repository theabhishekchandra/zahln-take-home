import { announce, AppText, ResultIcon, useTheme, type IconName } from '@zahln/ui-native';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';

export interface ResultHeroProps {
  readonly icon: IconName;
  readonly iconColor: string;
  readonly iconBackground: string;
  readonly title: string;
  /** Read out when the screen appears, so the cashier hears the outcome without looking. */
  readonly announcement: string;
  /** In place of the round icon, e.g. the faded code of T6. */
  readonly art?: ReactNode;
  readonly children?: ReactNode;
}

/** The big icon and headline of a till result: declined, expired, connection lost. */
export function ResultHero({ icon, iconColor, iconBackground, title, announcement, art, children }: ResultHeroProps) {
  const theme = useTheme();
  useEffect(() => announce(announcement), [announcement]);
  return (
    <View style={{ alignItems: 'center', gap: theme.spacing[5], maxWidth: 560 }}>
      {art ?? <ResultIcon icon={icon} color={iconColor} background={iconBackground} size={150} />}
      <AppText variant="titleL" style={{ fontSize: 46, lineHeight: 52, textAlign: 'center' }}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

/** A paragraph under a result headline. */
export function HeroBody({ children }: { readonly children: ReactNode }) {
  return (
    <AppText tone="secondary" style={{ fontSize: 19, lineHeight: 28, textAlign: 'center' }}>
      {children}
    </AppText>
  );
}
