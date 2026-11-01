import { pinStatus, verifyPin } from '@zahln/application';
import { useFormat, useTranslation } from '@zahln/i18n';
import { announce, AppText, IconButton, useCountdown, usePinInput, useTheme } from '@zahln/ui-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, View } from 'react-native';

import { useDependencies } from '@/lib/dependencies';

import { PinLayout } from './PinLayout';

export interface PinEntryProps {
  readonly visible: boolean;
  /** Shown at the top, e.g. "€5.30 · Mensa Zentral". */
  readonly context?: string;
  readonly onCorrect: () => void;
  readonly onCancel: () => void;
  readonly onBiometrics?: () => void;
}

/** Full-screen PIN check (design screen 08). Wrong tries and the lock are kept on the device. */
export function PinEntry({ visible, ...props }: PinEntryProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onCancel}>
      {visible ? <PinCheck {...props} /> : null}
    </Modal>
  );
}

export interface PinCheckProps extends Omit<PinEntryProps, 'visible' | 'context'> {
  /** Middle of the top row: text such as "€5.30 · Mensa Zentral", or e.g. step bars. */
  readonly context?: ReactNode;
  readonly title?: string;
}

/** The PIN check itself, for screens that show it in place rather than as a modal. */
export function PinCheck({ context, title, onCorrect, onCancel, onBiometrics }: PinCheckProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const { pin } = useDependencies();
  const [message, setMessage] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);
  const lockSeconds = useCountdown(lockedUntil?.getTime() ?? null);
  const locked = lockedUntil !== null && lockSeconds > 0;

  useEffect(() => {
    pinStatus(pin).then((status) => setLockedUntil(status.lockedUntil));
  }, [pin]);

  const input = usePinInput(async (digits, controls) => {
    const check = await verifyPin(pin, digits);
    switch (check.result) {
      case 'correct':
        return onCorrect();
      case 'wrong': {
        const wrong = t('pin.wrong', { count: check.attemptsLeft });
        controls.reject();
        setMessage(wrong);
        return announce(wrong);
      }
      case 'locked': {
        const lockedText = t('pin.locked', { time: format.time(check.until) });
        controls.reject();
        setLockedUntil(check.until);
        setMessage(null);
        return announce(lockedText);
      }
      case 'not_set':
        return onCancel();
    }
  });

  return (
    <PinLayout
      input={input}
      title={title ?? t('pin.enterTitle')}
      disabled={locked}
      onBiometrics={onBiometrics}
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon="chevronLeft" accessibilityLabel={t('common.back')} onPress={onCancel} />
          {typeof context === 'string' ? (
            <AppText variant="label" tone="muted" style={{ fontSize: 13 }}>
              {context}
            </AppText>
          ) : (
            context
          )}
          <View style={{ width: theme.size.tapMin }} />
        </View>
      }>
      {locked && lockedUntil ? (
        <AppText variant="bodyStrong" tone="danger" style={{ textAlign: 'center' }} accessibilityLiveRegion="assertive">
          {t('pin.locked', { time: format.time(lockedUntil) })}
        </AppText>
      ) : message ? (
        <AppText variant="bodyStrong" tone="danger" style={{ textAlign: 'center' }} accessibilityLiveRegion="assertive">
          {message}
        </AppText>
      ) : null}
      <AppText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
        {t('pin.lockRule')}
      </AppText>
    </PinLayout>
  );
}
