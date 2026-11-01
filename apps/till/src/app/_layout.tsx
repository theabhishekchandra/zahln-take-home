import { createI18n, I18nextProvider, resolveLanguage } from '@zahln/i18n';
import { getLocales } from 'expo-localization';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { startContainer, type Container } from '@/lib/container';
import { DependenciesProvider } from '@/lib/dependencies';
import { ShiftProvider } from '@/lib/shift';
import { useAppGate } from '@/lib/use-app-gate';

const i18n = createI18n(resolveLanguage(getLocales().map((locale) => locale.languageTag)));

export default function RootLayout() {
  // Created on first render, not on import: importing a route must not start listeners or timers.
  // It waits for one storage read: which server this launch talks to.
  const [container, setContainer] = useState<Container | null>(null);
  useEffect(() => {
    void startContainer().then(setContainer);
  }, []);
  if (!container) return null;
  return (
    <I18nextProvider i18n={i18n}>
      <DependenciesProvider container={container}>
        <ShiftProvider>
          <Navigation />
        </ShiftProvider>
      </DependenciesProvider>
    </I18nextProvider>
  );
}

function Navigation() {
  useAppGate();
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        {/* No back gesture: the register is left only by signing out. */}
        <Stack.Screen name="register" options={{ gestureEnabled: false, animation: 'none' }} />
        <Stack.Screen name="refunds" options={{ gestureEnabled: false, animation: 'none' }} />
      </Stack>
    </>
  );
}
