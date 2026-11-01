import { createI18n, I18nextProvider, resolveLanguage } from '@zahln/i18n';
import { getLocales } from 'expo-localization';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { AccountProvider } from '@/lib/account';
import { startContainer, type Container } from '@/lib/container';
import { DependenciesProvider } from '@/lib/dependencies';
import { applySavedLanguage } from '@/lib/language';
import { useAppGate } from '@/lib/use-app-gate';
import { useRecovery } from '@/lib/use-recovery';

const i18n = createI18n(resolveLanguage(getLocales().map((locale) => locale.languageTag)));

export default function RootLayout() {
  // Created on first render, not on import: importing a route must not start listeners or timers.
  // It waits for two storage reads: which server this launch talks to, and the chosen language.
  const [container, setContainer] = useState<Container | null>(null);
  useEffect(() => {
    void startContainer().then(async (started) => {
      await applySavedLanguage(started.settings, i18n);
      setContainer(started);
    });
  }, []);
  if (!container) return null;
  return (
    <I18nextProvider i18n={i18n}>
      <DependenciesProvider container={container}>
        <AccountProvider>
          <Navigation />
        </AccountProvider>
      </DependenciesProvider>
    </I18nextProvider>
  );
}

function Navigation() {
  useRecovery();
  useAppGate();
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        {/* No swipe-down: the flow decides when it may close. */}
        <Stack.Screen name="pay" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      </Stack>
    </>
  );
}
