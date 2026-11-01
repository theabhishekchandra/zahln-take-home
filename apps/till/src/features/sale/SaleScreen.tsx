import { ticketItemCount } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { AppText, useExternalStore, useTheme } from '@zahln/ui-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PausedView } from '@/features/register/PausedView';
import { RegisterView } from '@/features/register/RegisterView';
import { TillHeader } from '@/features/register/TillHeader';
import { SessionDialog } from '@/features/session/SessionDialog';
import { useDependencies } from '@/lib/dependencies';
import { useSignedInShift } from '@/lib/shift';
import { useMenu } from '@/lib/use-menu';
import { useOnline } from '@/lib/use-online';
import { useSignInAgain } from '@/lib/use-sign-in-again';
import { useSignOut } from '@/lib/use-sign-out';

import { CheckingView } from './CheckingView';
import { DeclinedView } from './DeclinedView';
import { ExpiredView } from './ExpiredView';
import { LatePayments } from './LatePayments';
import { PaidView } from './PaidView';
import { ProblemNotice } from './ProblemNotice';
import { QrView } from './QrView';
import { SetAsideDialog } from './SetAsideDialog';

/**
 * The till's one working screen. Shows the view for the sale's state; the
 * state only moves on what Zahln's server says (`TillSaleController`).
 */
export function SaleScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const shift = useSignedInShift();
  const deps = useDependencies();
  const sale = deps.sale();
  const snapshot = useExternalStore(sale);
  const { gate } = useExternalStore(deps.gate);
  const online = useOnline();
  const menu = useMenu(shift.login.mensaId, online);
  const [confirmingSetAside, setConfirmingSetAside] = useState(false);
  const signInAgain = useSignInAgain();
  const signOut = useSignOut();

  const state = snapshot.sale;
  const busy = snapshot.pending !== null;
  const setAside = () => {
    sale.setAside();
    setConfirmingSetAside(false);
  };

  const view = (() => {
    if (!menu) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <AppText tone="muted">{t('common.loading')}</AppText>
        </View>
      );
    }
    switch (state?.step) {
      case undefined:
        if (gate.status === 'payments_disabled') return <PausedView onOpenRefunds={() => router.replace('/refunds')} />;
        return (
          <RegisterView
            menu={menu}
            ticket={snapshot.ticket}
            online={online}
            gate={gate}
            busy={busy}
            problem={snapshot.problem}
            onAdd={(id) => sale.add(id)}
            onRemove={(id) => sale.remove(id)}
            onClear={() => sale.clear()}
            onShowQr={() => void sale.ringUp()}
          />
        );
      case 'awaiting':
        return <QrView shift={shift} order={state.order} onSetAside={() => setConfirmingSetAside(true)} />;
      case 'expired':
        return <ExpiredView order={state.order} busy={busy} onNewCode={() => void sale.newCode()} onSetAside={() => sale.setAside()} />;
      case 'declined':
        return <DeclinedView order={state.order} onShowAgain={() => sale.showCodeAgain()} onSetAside={() => sale.setAside()} />;
      case 'checking':
        return <CheckingView order={state.order} cause={state.cause} recheck={snapshot.recheck} onCheckNow={() => sale.checkNow()} />;
      case 'paid':
        return <PaidView order={state.order} payment={state.payment} onNext={() => sale.next()} />;
    }
  })();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {state ? null : (
        <TillHeader
          shift={shift}
          section="sale"
          // T13: offline there's nothing to refund against, so the sections are hidden.
          onSection={online ? (section) => section === 'refunds' && router.replace('/refunds') : undefined}
          online={online}
          onSignOut={signOut}
        />
      )}
      <LatePayments />
      {view}
      {state && snapshot.problem ? <ProblemNotice problem={snapshot.problem} /> : null}
      <SetAsideDialog visible={confirmingSetAside && state?.step === 'awaiting'} onKeep={() => setConfirmingSetAside(false)} onConfirm={setAside} />
      <SessionDialog
        visible={snapshot.sessionExpired}
        itemCount={ticketItemCount(state?.order.items ?? snapshot.ticket)}
        onSignInAgain={signInAgain}
        onOtherTill={signOut}
      />
    </View>
  );
}
