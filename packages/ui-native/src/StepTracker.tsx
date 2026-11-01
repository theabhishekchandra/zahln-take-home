import { ActivityIndicator, View } from 'react-native';

import { AppText } from './AppText';
import { Icon } from './Icon';
import { useTheme } from './theme';

export type StepStatus = 'done' | 'active' | 'pending';

export interface Step {
  readonly label: string;
  readonly status: StepStatus;
}

export interface StepTrackerProps {
  readonly steps: readonly Step[];
  /** Without its own card, inside a box that already has one. */
  readonly bare?: boolean;
  /** `pending`: an amber spinner, while the outcome is in doubt. */
  readonly activeTone?: 'brand' | 'pending';
}

/** Progress of something the user waits for, read out as it changes. */
export function StepTracker({ steps, bare = false, activeTone = 'brand' }: StepTrackerProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        { gap: 14 },
        bare ? null : { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.card, padding: 18, boxShadow: theme.elevation.card },
      ]}>
      {steps.map((step) => (
        <View key={step.label} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}>
          <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
            {step.status === 'done' ? (
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="tick" size={14} strokeWidth={3.4} color={theme.colors.onBrand} />
              </View>
            ) : step.status === 'active' ? (
              <ActivityIndicator color={activeTone === 'pending' ? theme.colors.pending : theme.colors.brand} />
            ) : (
              <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: theme.colors.lineDisabled }} />
            )}
          </View>
          <AppText variant="bodyStrong" tone={step.status === 'pending' ? 'muted' : 'ink'} style={{ flex: 1 }}>
            {step.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}
