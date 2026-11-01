import { hasPin } from '@zahln/application';
import { PRICE_GROUPS, type PriceGroup } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { AppText, Avatar, Button, Card, HeroPattern, Icon, initials, NoticeCard, ServerDialog, useTheme } from '@zahln/ui-native';
import { hero } from '@zahln/ui-tokens';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAccount } from '@/lib/account';
import { useDependencies } from '@/lib/dependencies';
import { useSavedLanguage } from '@/lib/language';

/**
 * 01 Choose test user. Zahln seeds one login per price group; choosing one
 * logs in as it. Prices come from the server once an order is scanned.
 */
export default function ChooseTestUser() {
  const { t } = useTranslation();
  const [language, setLanguage] = useSavedLanguage();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { pin, server } = useDependencies();
  const [serverOpen, setServerOpen] = useState(false);
  const account = useAccount();
  const [selected, setSelected] = useState<PriceGroup>(account.user?.priceGroup ?? 'student');
  const [signingIn, setSigningIn] = useState(false);
  const [failed, setFailed] = useState(false);

  const continueAs = async () => {
    setSigningIn(true);
    setFailed(false);
    const signedIn = await account.signIn(selected);
    setSigningIn(false);
    if (!signedIn) return setFailed(true);
    router.replace((await hasPin(pin)) ? '/home' : '/onboarding/pin');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: theme.spacing[6] }}>
        <View
          style={{
            backgroundColor: hero.ground,
            paddingTop: insets.top + theme.spacing[4],
            paddingHorizontal: theme.spacing[6],
            paddingBottom: 72,
            overflow: 'hidden',
          }}>
          <HeroPattern />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText variant="titleM" accessibilityRole="none" style={{ color: hero.ink, fontSize: 26, letterSpacing: -0.8 }}>
              {t('common.appName')}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('language.switch')}
              onPress={() => setLanguage(language === 'de' ? 'en' : 'de')}
              style={{ minHeight: theme.size.tapMin, justifyContent: 'center' }}>
              {({ pressed }) => (
                <View
                  style={{
                    minHeight: 36,
                    justifyContent: 'center',
                    paddingHorizontal: theme.spacing[3],
                    borderRadius: theme.radius.pill,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.33)',
                    backgroundColor: pressed ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  }}>
                  <AppText variant="label" style={{ color: hero.ink, fontSize: 13 }}>
                    {t('language.toggle')}
                  </AppText>
                </View>
              )}
            </Pressable>
          </View>
          <AppText
            variant="titleL"
            style={{ color: hero.ink, marginTop: 56, fontSize: 34, lineHeight: 40, letterSpacing: -1, maxWidth: 300 }}>
            {t('userPicker.tagline')}
          </AppText>
          <AppText style={{ color: hero.inkMuted, marginTop: theme.spacing[2], maxWidth: 300 }}>{t('userPicker.intro')}</AppText>
        </View>

        <Card
          style={{
            marginTop: -40,
            marginHorizontal: theme.spacing[4],
            paddingTop: theme.spacing[5],
            paddingBottom: theme.spacing[3],
            boxShadow: '0 1px 2px rgba(16, 24, 20, 0.05), 0 12px 32px rgba(16, 24, 20, 0.10)',
          }}>
          <View style={{ paddingHorizontal: theme.spacing[1], marginBottom: theme.spacing[3] }}>
            <AppText variant="titleS" style={{ fontSize: 17, lineHeight: 24 }}>
              {t('userPicker.title')}
            </AppText>
            <AppText variant="caption" tone="muted">
              {t('userPicker.hint')}
            </AppText>
          </View>
          <View accessibilityRole="radiogroup" style={{ gap: theme.spacing[1] }}>
            {PRICE_GROUPS.map((group) => {
              const isSelected = group === selected;
              const label = t(`userPicker.${group}`);
              return (
                <Pressable
                  key={group}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={t('userPicker.rowLabel', { group: label, username: group })}
                  onPress={() => setSelected(group)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing[3],
                    minHeight: 72,
                    paddingHorizontal: theme.spacing[3],
                    paddingVertical: theme.spacing[2],
                    borderRadius: theme.radius.control,
                    backgroundColor: isSelected ? theme.colors.brandTint : pressed ? theme.colors.pressed : 'transparent',
                  })}>
                  <Avatar initials={initials(label)} selected={isSelected} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{label}</AppText>
                    <AppText variant="caption" tone="muted">
                      {group}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </ScrollView>

      <View style={{ paddingHorizontal: theme.spacing[6], paddingBottom: insets.bottom + theme.spacing[4], gap: theme.spacing[3] }}>
        {failed ? <NoticeCard tone="problem" title={t('userPicker.signInFailed')} /> : null}
        <Button
          label={t('userPicker.continueAs', { group: t(`userPicker.${selected}`) })}
          loading={signingIn}
          loadingLabel={t('userPicker.signingIn')}
          onPress={() => void continueAs()}
        />
        {/* A long press opens the server setting in test builds. */}
        <Pressable
          onLongPress={server.canChange ? () => setServerOpen(true) : undefined}
          delayLongPress={800}
          // Plain text in store builds; in test builds a screen reader says how to reach the setting.
          accessibilityRole={server.canChange ? 'button' : 'text'}
          accessibilityHint={server.canChange ? t('userPicker.serverHint') : undefined}
          style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          <Icon name="lock" size={14} color={theme.colors.inkMuted} />
          <AppText variant="caption" tone="muted" style={{ fontSize: 12 }}>
            {t('userPicker.testEnvironment')}
          </AppText>
        </Pressable>
        <ServerDialog
          visible={serverOpen}
          current={server.current}
          buildDefault={server.buildDefault}
          isValid={server.isValid}
          onSave={server.save}
          onClose={() => setServerOpen(false)}
        />
      </View>
    </View>
  );
}

/** Decorative grid of tiles in the hero's corner, from the design. */
