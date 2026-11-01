import type { RefundController, RefundSnapshot } from '@zahln/application';
import {
  draftAmount,
  draftProblem,
  isPositive,
  REFUND_REASONS,
  refundableAmount,
  refundBlockedBy,
  type RefundDraft,
  type RefundRefusal,
} from '@zahln/domain';
import { useFormat, useTranslation } from '@zahln/i18n';
import { AppText, Button, ChipGroup, Icon, NoticeCard, useCountdown, useExternalStore, useKeyboardHeight, useTheme } from '@zahln/ui-native';
import { useRef } from 'react';
import { ScrollView, View, type ScrollViewInstance } from 'react-native';

import { AmountField } from './AmountField';

/** T10 / T11, right: how much to give back and why, or why it can't be. */
export function RefundPanel({ refund }: { readonly refund: RefundController }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const snapshot = useExternalStore(refund);
  const { flow } = snapshot;
  const { payment } = flow;
  const refundable = refundableAmount(payment);
  const blocked = refundBlockedBy(payment);
  const scroll = useRef<ScrollViewInstance>(null);
  const keyboard = useKeyboardHeight();
  const amountY = useRef(0);

  return (
    <ScrollView
      ref={scroll}
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, gap: theme.spacing[3] }}
      keyboardShouldPersistTaps="handled"
      // The panel shrinks above the keyboard: bring the amount being typed into view.
      onLayout={() => {
        if (keyboard > 0) scroll.current?.scrollTo({ y: amountY.current });
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <AppText variant="titleM" style={{ fontVariant: ['tabular-nums'] }}>
          {format.money(payment.amount)}
        </AppText>
        <AppText variant="caption" tone="muted">
          {`${format.time(payment.createdAt)} · ${t(`priceGroup.${payment.priceGroup}`)}`}
        </AppText>
      </View>
      {payment.refunded.cents > 0 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.colors.surface, borderRadius: theme.radius.control, paddingVertical: 12, paddingHorizontal: 14 }}>
          <AppText tone="muted">{t('till.refunds.alreadyRefunded')}</AppText>
          <AppText variant="bodyStrong">{format.money(payment.refunded)}</AppText>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: theme.spacing[3] }}>
        <AppText variant="label" tone="muted" style={{ fontSize: 14 }}>
          {t('till.refunds.refundable')}
        </AppText>
        <AppText variant="titleL" style={{ fontSize: 30, lineHeight: 36, fontVariant: ['tabular-nums'] }}>
          {format.money(refundable)}
        </AppText>
      </View>

      {flow.step === 'checking' ? (
        <Checking snapshot={snapshot} onCheckNow={() => refund.checkNow()} />
      ) : flow.step === 'refunded' ? null : blocked ? (
        <NoticeCard tone={blocked === 'being_checked' ? 'pending' : 'problem'} title={t('till.refunds.refused')} body={t(`till.refunds.refusal.${blocked}`)} />
      ) : (
        <Form
          snapshot={snapshot}
          onEdit={(draft) => refund.edit(draft)}
          onSubmit={() => void refund.submit()}
          onAmountLayout={(y) => {
            amountY.current = y;
          }}
        />
      )}
    </ScrollView>
  );
}

interface FormProps {
  readonly snapshot: RefundSnapshot;
  readonly onEdit: (draft: RefundDraft) => void;
  readonly onSubmit: () => void;
  /** Where the amount field sits in the panel, to scroll it above the keyboard. */
  readonly onAmountLayout: (y: number) => void;
}

function Form({ snapshot, onEdit, onSubmit, onAmountLayout }: FormProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const format = useFormat();
  const { flow } = snapshot;
  if (flow.step !== 'editing' && flow.step !== 'submitting') return null;
  const { payment, draft } = flow;
  const refusal = flow.step === 'editing' ? flow.refusal : null;
  const refundable = refundableAmount(payment);
  const amount = draftAmount(draft, payment);
  const problem = draftProblem(draft, payment);
  const submitting = flow.step === 'submitting';
  const refusalText = refusal ? refusalMessage(refusal.reason, t, format.money(refusal.amount), format.money(refundable)) : null;

  return (
    <>
      <View style={{ gap: theme.spacing[2] }}>
        <AppText variant="label" tone="muted" style={{ fontSize: 13 }}>
          {t('till.refunds.mode')}
        </AppText>
        <ChipGroup
          role="radiogroup"
          accessibilityLabel={t('till.refunds.mode')}
          selected={draft.mode}
          onSelect={(mode) => onEdit({ ...draft, mode })}
          options={[
            { value: 'full', label: t('till.refunds.full', { amount: format.money(refundable) }) },
            { value: 'partial', label: t('till.refunds.partial') },
          ]}
        />
      </View>
      {draft.mode === 'partial' ? (
        <View onLayout={(event) => onAmountLayout(event.nativeEvent.layout.y)}>
          <AmountField
            label={t('till.refunds.amount')}
            hint={t('till.refunds.amountHint')}
            value={draft.amountText}
            onChange={(amountText) => onEdit({ ...draft, amountText })}
            invalid={refusal !== null}
            invalidMessage={refusalText ?? undefined}
            editable={!submitting}
          />
        </View>
      ) : null}
      {refusal && refusalText ? (
        <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={{ gap: theme.spacing[2] }}>
          <View style={{ flexDirection: 'row', gap: theme.spacing[2], backgroundColor: theme.colors.dangerTint, borderRadius: theme.radius.control, padding: 14 }}>
            <Icon name="alert" size={20} color={theme.colors.danger} />
            <AppText style={{ flex: 1, fontSize: 15, lineHeight: 21 }}>
              <AppText variant="bodyStrong" style={{ fontSize: 15 }}>
                {t('till.refunds.refused')}
              </AppText>{' '}
              {refusalText}
            </AppText>
          </View>
          {refusal.reason === 'exceeds_remaining' && isPositive(refundable) ? (
            <View style={{ alignSelf: 'flex-start' }}>
              <Button
                variant="secondary"
                label={t('till.refunds.useInstead', { amount: format.money(refundable) })}
                onPress={() => onEdit({ ...draft, mode: 'partial', amountText: format.moneyInput(refundable) })}
              />
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={{ gap: theme.spacing[2] }}>
        <AppText variant="label" tone="muted" style={{ fontSize: 13 }}>
          {t('till.refunds.reason')}
        </AppText>
        <ChipGroup
          role="radiogroup"
          accessibilityLabel={t('till.refunds.reason')}
          selected={draft.reason}
          onSelect={(reason) => onEdit({ ...draft, reason })}
          height={42}
          wrap
          options={REFUND_REASONS.map((reason) => ({ value: reason, label: t(`till.refunds.reasons.${reason}`) }))}
        />
      </View>
      {snapshot.problem ? <NoticeCard tone="problem" title={t(`till.refunds.problem.${snapshot.problem}`)} /> : null}
      <View style={{ marginTop: 'auto' }}>
        <Button
          size="large"
          label={amount ? t('till.refunds.submit', { amount: format.money(amount) }) : t('till.refunds.submitEmpty')}
          loading={submitting}
          loadingLabel={t('till.refunds.submitting')}
          disabled={problem !== null || refusal !== null}
          disabledReason={problem === 'no_amount' ? t('till.refunds.needAmount') : problem === 'no_reason' ? t('till.refunds.needReason') : undefined}
          onPress={onSubmit}
        />
      </View>
    </>
  );
}

function Checking({ snapshot, onCheckNow }: { readonly snapshot: RefundSnapshot; readonly onCheckNow: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const seconds = useCountdown(snapshot.recheck.nextCheckAt);
  const { recheck } = snapshot;
  return (
    <>
      <NoticeCard tone="pending" title={t('till.refunds.checkingTitle')} body={t('till.refunds.checkingBody')} />
      <AppText variant="caption" tone="muted" accessibilityLiveRegion="polite" style={{ fontVariant: ['tabular-nums'] }}>
        {recheck.checking || !recheck.nextCheckAt ? t('till.lost.checkingNow') : t('till.lost.nextCheck', { seconds })}
        {recheck.checks > 0 ? ` · ${t('till.lost.checked', { count: recheck.checks })}` : ''}
      </AppText>
      <View style={{ marginTop: 'auto', gap: theme.spacing[3] }}>
        <Button size="large" label={t('till.lost.checkNow')} onPress={onCheckNow} loading={recheck.checking} />
      </View>
    </>
  );
}

type T = ReturnType<typeof useTranslation>['t'];

function refusalMessage(reason: RefundRefusal, t: T, amount: string, left: string): string {
  return t(`till.refunds.refusal.${reason}`, { amount, left });
}
