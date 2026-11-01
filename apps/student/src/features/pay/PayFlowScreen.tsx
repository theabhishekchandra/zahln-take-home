import type { OrderRef } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { announce, useExternalStore } from '@zahln/ui-native';
import { router, usePreventRemove } from 'expo-router';
import { useEffect, useState } from 'react';

import { PinEntry } from '@/features/pin/PinEntry';
import { ScanView } from '@/features/scan/ScanView';
import { useDependencies } from '@/lib/dependencies';
import { useAccount, useSignedInUser } from '@/lib/account';

import { CheckingView } from './CheckingView';
import { NotPaidView } from './NotPaidView';
import { PaidView } from './PaidView';
import { PayingView } from './PayingView';
import { qrProblemFor } from './pay-view';
import { ReviewView } from './ReviewView';
import { SessionView } from './SessionView';
import { useAuthorize } from './use-authorize';

/**
 * The whole pay flow on one screen: it shows the view for the controller's
 * state and forwards taps to it. Back is ignored while the payment is being
 * sent; leaving at any other point keeps a payment that is being checked.
 */
export function PayFlowScreen() {
  const { t } = useTranslation();
  const { payFlow, gate } = useDependencies();
  const user = useSignedInUser();
  const account = useAccount();
  const { state, orderRef, authMethod, recheck } = useExternalStore(payFlow);

  // Zahln refused for a reason its config explains: read it now, so home says so too.
  const refusedByConfig = state.step === 'notPaid' && (state.reason === 'payments_disabled' || state.reason === 'update_required');
  useEffect(() => {
    if (refusedByConfig) void gate.refresh();
  }, [refusedByConfig, gate]);

  usePreventRemove(state.step === 'submitting', () => announce(t('paying.inProgress')));
  // Leaving resets the flow; the controller ignores it while money may be moving.
  useEffect(() => () => payFlow.reset(), [payFlow]);

  const close = () => router.back();
  const scan = (ref: OrderRef) => void payFlow.scan(ref, user);
  const scanAgain = () => payFlow.reset();

  switch (state.step) {
    case 'idle':
      return <ScanView flowProblem={null} onOrder={scan} onScanAgain={scanAgain} onClose={close} />;
    case 'loadingQuote':
    case 'reviewing':
    case 'authorizing':
      return <ReviewView state={state} onCancel={close} />;
    case 'submitting':
      return <PayingView intent={state.intent} authMethod={authMethod} />;
    case 'verifying':
      return <CheckingView intent={state.intent} recheck={recheck} onCheckNow={() => payFlow.checkNow()} onHome={close} />;
    case 'confirmed':
      return <PaidView intent={state.intent} payment={state.payment} onDone={close} />;
    case 'declined':
      return <NotPaidView outcome={{ kind: 'declined', payment: state.payment }} onScanAgain={scanAgain} onHome={close} />;
    case 'notPaid': {
      if (state.reason === 'session_expired') {
        // The student confirms it is them; the app then logs in to Zahln again and reopens the same order.
        const reopen = async () => {
          if ((await account.signIn(user.priceGroup)) && orderRef) scan(orderRef);
        };
        return <SignInAgain onSignedIn={() => void reopen()} />;
      }
      const problem = qrProblemFor(state.reason);
      if (problem) return <ScanView flowProblem={problem} onOrder={scan} onScanAgain={scanAgain} onClose={close} />;
      return <NotPaidView outcome={{ kind: 'failed', reason: state.reason }} onScanAgain={scanAgain} onHome={close} />;
    }
  }
}

/** Re-authenticates after the session expired, then reopens the same order. */
function SignInAgain({ onSignedIn }: { readonly onSignedIn: () => void }) {
  const { t } = useTranslation();
  const { canUseBiometrics, withBiometrics } = useAuthorize();
  const [pinOpen, setPinOpen] = useState(false);

  const signIn = async () => {
    if (!canUseBiometrics) return setPinOpen(true);
    const result = await withBiometrics(t('session.title'));
    if (result === 'authorized') onSignedIn();
    else setPinOpen(true);
  };

  return (
    <>
      <SessionView canUseBiometrics={canUseBiometrics} onSignIn={() => void signIn()} onOtherAccount={() => router.dismissTo('/')} />
      <PinEntry
        visible={pinOpen}
        onCorrect={() => {
          setPinOpen(false);
          onSignedIn();
        }}
        onCancel={() => setPinOpen(false)}
      />
    </>
  );
}
