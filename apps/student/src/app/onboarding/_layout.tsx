import { Stack } from 'expo-router';

import { RequireUser } from '@/lib/require-user';

export default function OnboardingLayout() {
  return (
    <RequireUser>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }} />
    </RequireUser>
  );
}
