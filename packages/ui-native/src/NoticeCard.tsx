import type { Colors } from '@zahln/ui-tokens';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { announce } from './announce';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { useTheme } from './theme';

export type NoticeTone = 'pending' | 'reassure' | 'problem';

const look: Readonly<Record<NoticeTone, { icon: IconName; fill: keyof Colors; ink: keyof Colors }>> = {
  pending: { icon: 'clock', fill: 'pendingTint', ink: 'pending' },
  reassure: { icon: 'shield', fill: 'brandTint', ink: 'brand' },
  problem: { icon: 'alert', fill: 'dangerTint', ink: 'danger' },
};

export interface NoticeCardProps {
  readonly tone: NoticeTone;
  readonly title: string;
  readonly body?: string;
  /** Makes the whole card one tap target, e.g. the "being checked" banner opening the payment. */
  readonly onPress?: () => void;
}

/**
 * Pending: "being checked, don't pay again". Reassure: "Nothing was charged".
 * Problem: the reason and the one next step, never a code alone.
 * Pending and problem notices are announced when they appear.
 */
export function NoticeCard({ tone, title, body, onPress }: NoticeCardProps) {
  const theme = useTheme();
  const { icon, fill, ink } = look[tone];
  const spoken = body ? `${title}. ${body}` : title;

  useEffect(() => {
    if (tone !== 'reassure') announce(spoken);
  }, [tone, spoken]);

  const content = (
    <>
      <Icon name={icon} size={18} strokeWidth={2.2} color={theme.colors[ink]} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" style={{ color: theme.colors[ink] }}>
          {title}
        </AppText>
        {body ? <AppText tone="secondary">{body}</AppText> : null}
      </View>
      {onPress ? <Icon name="chevronRight" size={20} strokeWidth={2.2} color={theme.colors[ink]} /> : null}
    </>
  );

  const style = {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    paddingHorizontal: 14,
    borderRadius: theme.radius.control,
    backgroundColor: theme.colors[fill],
  } as const;

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={spoken} style={style}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onPress}
      style={({ pressed }) => [style, { minHeight: theme.size.tapMin, opacity: pressed ? 0.85 : 1 }]}>
      {content}
    </Pressable>
  );
}
