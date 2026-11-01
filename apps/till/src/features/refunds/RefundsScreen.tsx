import type { Payment, PaymentId } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { AppText, NoticeCard, useExternalStore, useKeyboardHeight, useTheme } from '@zahln/ui-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/features/register/OfflineBanner';
import { TillHeader, type TillSection } from '@/features/register/TillHeader';
import { PANEL_WIDTH } from '@/features/sale/SaleLayout';
import { SessionDialog } from '@/features/session/SessionDialog';
import { useDependencies } from '@/lib/dependencies';
import { useSignedInShift } from '@/lib/shift';
import { useOnline } from '@/lib/use-online';
import { useSignInAgain } from '@/lib/use-sign-in-again';
import { useSignOut } from '@/lib/use-sign-out';

import { PaymentList } from './PaymentList';
import { RefundedView } from './RefundedView';
import { RefundPanel } from './RefundPanel';
import { useTodayPayments } from './use-today-payments';

/**
 * T10–T12: refund one of today's payments on this till. Opened with
 * `?payment=` (a late payment), that payment is picked.
 */
export function RefundsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const online = useOnline();
  const params = useLocalSearchParams<{ payment?: string }>();
  const [today, reload] = useTodayPayments(online);
  const signInAgain = useSignInAgain(reload);
  const signOut = useSignOut();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<PaymentId | null>((params.payment as PaymentId | undefined) ?? null);
  const payments = today.status === 'ready' ? today.payments : [];
  const selected = payments.find((p) => p.id === selectedId) ?? null;

  const list = (locked: boolean) =>
    today.status === 'ready' ? (
      <PaymentList payments={payments} query={query} onQuery={setQuery} selected={selectedId} onSelect={setSelectedId} locked={locked} />
    ) : (
      <View style={{ flex: 1, padding: theme.spacing[6] }}>
        {today.status === 'loading' ? <AppText tone="muted">{t('common.loading')}</AppText> : <NoticeCard tone="problem" title={t('till.refunds.loadFailed')} />}
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      {selected ? (
        // Keyed: each payment gets its own refund controller.
        <Refunding
          key={selected.id}
          payment={selected}
          online={online}
          list={list}
          onSignOut={signOut}
          onDone={() => {
            setSelectedId(null);
            reload();
          }}
        />
      ) : (
        <RefundsLayout online={online} locked={false} onSignOut={signOut} list={list(false)}>
          <AppText tone="muted">{t('till.refunds.pick')}</AppText>
        </RefundsLayout>
      )}
      <SessionDialog visible={today.status === 'failed' && today.sessionExpired} itemCount={0} onSignInAgain={signInAgain} onOtherTill={signOut} />
    </View>
  );
}

const toSale = (section: TillSection) => section === 'sale' && router.replace('/register');

interface RefundingProps {
  readonly payment: Payment;
  readonly online: boolean;
  readonly list: (locked: boolean) => ReactNode;
  readonly onSignOut: () => void;
  readonly onDone: () => void;
}

/** One payment selected: its refund panel, or the result once the server confirmed. */
function Refunding({ payment, online, list, onSignOut, onDone }: RefundingProps) {
  const { refundFor } = useDependencies();
  const [refund] = useState(() => refundFor(payment));
  const snapshot = useExternalStore(refund);
  const signInAgain = useSignInAgain(() => refund.sessionRenewed());
  const shift = useSignedInShift();
  const { flow } = snapshot;
  // A refund on its way, or in doubt, keeps the cashier on it until the server has answered.
  const locked = flow.step === 'submitting' || flow.step === 'checking';

  if (flow.step === 'refunded') {
    return (
      <>
        <TillHeader shift={shift} section="refunds" onSection={toSale} online={online} onSignOut={onSignOut} />
        <RefundedView payment={flow.payment} refund={flow.refund} onBack={onDone} onTakePayment={() => router.replace('/register')} />
      </>
    );
  }
  return (
    <>
      <RefundsLayout online={online} locked={locked} onSignOut={onSignOut} list={list(locked)}>
        <RefundPanel refund={refund} />
      </RefundsLayout>
      <SessionDialog visible={snapshot.sessionExpired} itemCount={0} onSignInAgain={signInAgain} onOtherTill={onSignOut} />
    </>
  );
}

interface RefundsLayoutProps {
  readonly online: boolean;
  /** Hides the section tabs: the cashier can't leave a refund in flight. */
  readonly locked: boolean;
  readonly onSignOut: () => void;
  readonly list: ReactNode;
  readonly children: ReactNode;
}

function RefundsLayout({ online, locked, onSignOut, list, children }: RefundsLayoutProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const shift = useSignedInShift();
  const keyboard = useKeyboardHeight();
  return (
    <>
      <TillHeader
        shift={shift}
        section="refunds"
        onSection={locked ? undefined : toSale}
        online={online}
        onSignOut={onSignOut}
      />
      {online ? null : <OfflineBanner />}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {list}
        <View
          style={{
            width: PANEL_WIDTH,
            backgroundColor: theme.colors.surfaceRaised,
            borderLeftWidth: 1,
            borderLeftColor: theme.colors.disabledFill,
            paddingTop: 22,
            paddingLeft: theme.spacing[6],
            paddingRight: insets.right + theme.spacing[6],
            // Above the keyboard while the amount is typed, so it and the Refund button stay in view.
            paddingBottom: Math.max(insets.bottom, keyboard) + 22,
          }}>
          {children}
        </View>
      </View>
    </>
  );
}
