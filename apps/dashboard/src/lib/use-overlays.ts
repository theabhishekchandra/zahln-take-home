import type { PaymentId } from '@zahln/domain';
import { useSearchParams } from 'react-router';

/** The payment drawer (W5) and export dialog (W6) live in the URL, so a link or Back opens and closes them. */
export function useOverlays() {
  const [params, setParams] = useSearchParams();
  const set = (name: string, value: string | null) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value === null) next.delete(name);
      else next.set(name, value);
      return next;
    });
  return {
    paymentId: (params.get('payment') as PaymentId | null) ?? null,
    openPayment: (id: PaymentId) => set('payment', id),
    closePayment: () => set('payment', null),
    exporting: params.get('export') === '1',
    openExport: () => set('export', '1'),
    closeExport: () => set('export', null),
  };
}
