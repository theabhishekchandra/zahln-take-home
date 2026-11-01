import { CASHIER_LOGINS, type CashierLogin } from '@zahln/api-client';
import type { MensaId, TillId } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { AppText, Button, ChipGroup, HeroPattern, NoticeCard, ServerDialog, useTheme } from '@zahln/ui-native';
import { hero } from '@zahln/ui-tokens';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDependencies } from '@/lib/dependencies';
import { useShift } from '@/lib/shift';
import { useOnline } from '@/lib/use-online';

/** Mensas that have a till, in the order of the logins. */
const MENSAS = [...new Map(CASHIER_LOGINS.map((login) => [login.mensaId, login.mensaName])).entries()];

/**
 * T1: which till this tablet is. Zahln seeds one cashier per till, so opening
 * a till logs in as its cashier; there's no PIN (the API has none).
 */
export function SignInScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const online = useOnline();
  const deps = useDependencies();
  const [serverOpen, setServerOpen] = useState(false);

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: theme.colors.surface }}>
      <View
        style={{
          width: Math.min(560, width * 0.42),
          backgroundColor: hero.ground,
          paddingTop: insets.top + 56,
          paddingBottom: insets.bottom + 40,
          paddingLeft: insets.left + 56,
          paddingRight: 40,
          gap: theme.spacing[5],
          overflow: 'hidden',
        }}>
        <HeroPattern style={{ top: insets.top + 40 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}>
          <AppText variant="titleL" style={{ color: hero.ink, fontSize: 30 }}>
            {t('common.appName')}
          </AppText>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: theme.radius.pill, paddingVertical: 4, paddingHorizontal: 12 }}>
            <AppText variant="bodyStrong" style={{ color: hero.ink, fontSize: 14 }}>
              {t('till.badge')}
            </AppText>
          </View>
        </View>
        <AppText variant="titleL" accessibilityRole="header" style={{ color: hero.ink, fontSize: 44, lineHeight: 50, maxWidth: 400, marginTop: 'auto' }}>
          {t('till.signIn.heroTitle')}
        </AppText>
        <AppText style={{ color: hero.inkMuted, fontSize: 17, lineHeight: 26, maxWidth: 420 }}>{t('till.signIn.heroBody')}</AppText>
        <View style={{ marginTop: 'auto', gap: theme.spacing[3] }}>
          {/* A long press opens the server setting in test builds. */}
          <Pressable
            accessible
            accessibilityLiveRegion="polite"
            onLongPress={deps.server.canChange ? () => setServerOpen(true) : undefined}
            delayLongPress={800}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: online ? hero.live : theme.colors.dangerTint }} />
            <AppText variant="caption" style={{ color: hero.inkMuted }}>
              {online ? t('till.signIn.online') : t('till.signIn.offline')}
            </AppText>
          </Pressable>
          <ServerDialog
            visible={serverOpen}
            current={deps.server.current}
            buildDefault={deps.server.buildDefault}
            isValid={deps.server.isValid}
            onSave={deps.server.save}
            onClose={() => setServerOpen(false)}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top + theme.spacing[6],
          paddingBottom: insets.bottom + theme.spacing[6],
          paddingRight: insets.right + theme.spacing[6],
          paddingLeft: theme.spacing[6],
        }}>
        <SignInCard online={online} />
      </ScrollView>
    </View>
  );
}

function SignInCard({ online }: { readonly online: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const deps = useDependencies();
  const [, setShift] = useShift();
  // A till with work still open is where the tablet signs in again.
  const inUse = CASHIER_LOGINS.find((login) => login.tillId === deps.tillInUse());
  const [mensaId, setMensaId] = useState<MensaId>(inUse?.mensaId ?? CASHIER_LOGINS[0]!.mensaId);
  const tills = CASHIER_LOGINS.filter((login) => login.mensaId === mensaId);
  const [tillId, setTillId] = useState<TillId | null>(inUse?.tillId ?? tills[0]?.tillId ?? null);
  const login = tills.find((candidate) => candidate.tillId === tillId) ?? null;
  const [failure, setFailure] = useState<'till_in_use' | 'failed' | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const pickMensa = (id: MensaId) => {
    setMensaId(id);
    setTillId(CASHIER_LOGINS.find((candidate) => candidate.mensaId === id)?.tillId ?? null);
    setFailure(null);
  };

  const open = async (chosen: CashierLogin) => {
    setSigningIn(true);
    setFailure(null);
    const result = await deps.openTill(chosen);
    setSigningIn(false);
    if (!result.ok) return setFailure(result.error);
    setShift({ login: chosen, cashier: result.value });
    router.replace('/register');
  };

  return (
    <View
      style={{
        width: '100%',
        maxWidth: 440,
        backgroundColor: theme.colors.surfaceRaised,
        borderRadius: theme.radius.sheet,
        padding: theme.spacing[8],
        gap: theme.spacing[3],
        boxShadow: theme.elevation.sheet,
      }}>
      <AppText variant="titleM" accessibilityRole="header">
        {t('till.signIn.title')}
      </AppText>
      <AppText variant="label" tone="muted" style={{ fontSize: 13 }}>
        {t('till.signIn.mensa')}
      </AppText>
      <ChipGroup
        role="radiogroup"
        accessibilityLabel={t('till.signIn.mensa')}
        selected={mensaId}
        onSelect={pickMensa}
        wrap
        options={MENSAS.map(([value, label]) => ({ value, label }))}
      />
      <AppText variant="label" tone="muted" style={{ fontSize: 13 }}>
        {t('till.signIn.till')}
      </AppText>
      <ChipGroup
        role="radiogroup"
        accessibilityLabel={t('till.signIn.till')}
        selected={tillId}
        onSelect={(id) => {
          setTillId(id);
          setFailure(null);
        }}
        options={tills.map((candidate) => ({ value: candidate.tillId, label: candidate.tillName }))}
      />
      {login ? (
        <AppText variant="caption" tone="muted">
          {t('till.signIn.signsInAs', { username: login.username })}
        </AppText>
      ) : null}
      {failure === 'till_in_use' && inUse ? (
        <NoticeCard tone="pending" title={t('till.signIn.inUse', { till: `${inUse.mensaName} · ${inUse.tillName}` })} />
      ) : failure ? (
        <NoticeCard tone="problem" title={t('till.signIn.failed')} />
      ) : null}
      <View style={{ marginTop: theme.spacing[2] }}>
        <Button
          size="large"
          label={t('till.signIn.open')}
          loading={signingIn}
          loadingLabel={t('till.signIn.opening')}
          disabled={!online || !login}
          onPress={() => login && void open(login)}
        />
      </View>
    </View>
  );
}
