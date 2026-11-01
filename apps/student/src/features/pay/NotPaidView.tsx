import type { NotPaidReason, Payment } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { Button, NoticeCard } from '@zahln/ui-native';

import { ResultLayout } from './ResultLayout';

export type NotPaidOutcome =
  | { readonly kind: 'declined'; readonly payment: Payment }
  | { readonly kind: 'failed'; readonly reason: NotPaidReason };

/** Design screen 12: declined by Zahln, or failed before anything was charged. Always says so. */
export function NotPaidView({ outcome, onScanAgain, onHome }: { readonly outcome: NotPaidOutcome; readonly onScanAgain: () => void; readonly onHome: () => void }) {
  const { t } = useTranslation();

  const title = outcome.kind === 'declined' ? t('declined.title') : t('failed.title');
  const spoken = outcome.kind === 'declined' ? t('declined.spoken') : t('failed.spoken');

  return (
    <ResultLayout
      icon="cross"
      tone="danger"
      title={title}
      spoken={spoken}
      footer={
        <>
          <Button label={t('common.scanAgain')} onPress={onScanAgain} />
          <Button label={t('common.backToHome')} variant="text" onPress={onHome} />
        </>
      }>
      {outcome.kind === 'declined' ? (
        <>
          {/* Zahln gives no reason for a decline, so the app doesn't guess one. */}
          <NoticeCard tone="problem" title={t('declined.reasonTitle')} body={t('declined.reasonBody')} />
          <NoticeCard tone="reassure" title={t('common.nothingCharged')} />
        </>
      ) : (
        <NoticeCard tone="problem" title={t(`failed.reason.${outcome.reason}`)} />
      )}
    </ResultLayout>
  );
}
