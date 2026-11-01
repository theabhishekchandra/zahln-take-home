import type { PayFlowState } from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, Button, Icon, IconButton, Screen, useTheme } from '@zahln/ui-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinEntry } from '@/features/pin/PinEntry';
import { useDependencies } from '@/lib/dependencies';

import { MerchantSummary } from './MerchantSummary';
import { OrderLines } from './OrderLines';
import { ReviewTimer } from './ReviewTimer';
import { useAuthorize } from './use-authorize';

type ReviewState = Extract<PayFlowState, { step: 'loadingQuote' | 'reviewing' | 'authorizing' }>;

/** Design screens 05 (loading) and 06 (review). Pay asks for the fingerprint, or the PIN. */
export function ReviewView({ state, onCancel }: { readonly state: ReviewState; readonly onCancel: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const format = useFormat();
  const { payFlow } = useDependencies();
  const { canUseBiometrics, withBiometrics } = useAuthorize();
  const [pinOpen, setPinOpen] = useState(false);

  const quote = state.step === 'loadingQuote' ? null : state.quote;
  const amount = quote ? format.money(quote.total) : '';

  const askBiometrics = async () => {
    setPinOpen(false);
    const result = await withBiometrics(t('review.biometricPrompt', { amount }));
    if (result === 'authorized') void payFlow.authorized('biometrics');
    else setPinOpen(true);
  };

  const pay = () => {
    payFlow.confirm();
    void askBiometrics();
  };

  return (
    <>
      <Screen
        scroll
        footer={
          quote ? (
            <>
              <Button
                label={t('review.pay', { amount })}
                accessibilityLabel={t('review.pay', { amount: format.moneySpoken(quote.total) })}
                loading={state.step === 'authorizing'}
                onPress={pay}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                <Icon name="lock" size={14} color={theme.colors.inkMuted} />
                <AppText variant="caption" tone="muted" style={{ fontSize: 12 }}>
                  {t('review.reassurance')}
                </AppText>
              </View>
            </>
          ) : undefined
        }>
        <View style={{ minHeight: theme.size.tapMin, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="bodyStrong" accessibilityRole="header">
            {t('review.title')}
          </AppText>
          {quote ? (
            <View style={{ position: 'absolute', right: 0 }}>
              <ReviewTimer expiresAt={quote.expiresAt} onExpired={() => payFlow.quoteExpired()} />
            </View>
          ) : null}
        </View>

        {quote ? (
          <>
            <MerchantSummary quote={quote} showPriceGroup />
            <OrderLines quote={quote} />
          </>
        ) : (
          <View accessibilityRole="progressbar" accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: theme.spacing[3], marginTop: 96 }}>
            <ActivityIndicator size="large" color={theme.colors.brand} />
            <AppText variant="bodyStrong">{t('review.loading')}</AppText>
          </View>
        )}

        {/*
          Last in the tree, as design screen 27 wants Cancel read last. Android's TalkBack sorts by
          position instead and reads it after the timer; RN's experimental_accessibilityOrder could
          force the order but couldn't be checked with TalkBack here, so it isn't used on this screen.
        */}
        <View style={{ position: 'absolute', top: insets.top + theme.spacing[2], left: theme.spacing[5] }}>
          <IconButton icon="close" accessibilityLabel={t('review.cancel')} onPress={onCancel} />
        </View>
      </Screen>

      <PinEntry
        visible={pinOpen}
        context={quote ? `${amount} · ${quote.mensa.name}` : undefined}
        onCorrect={() => {
          setPinOpen(false);
          void payFlow.authorized('pin');
        }}
        onCancel={() => {
          setPinOpen(false);
          payFlow.cancelAuthorization();
        }}
        onBiometrics={canUseBiometrics ? () => void askBiometrics() : undefined}
      />
    </>
  );
}
