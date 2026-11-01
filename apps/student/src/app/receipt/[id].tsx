import { asPaymentId } from '@zahln/domain';
import { useLocalSearchParams } from 'expo-router';

import { ReceiptScreen } from '@/features/receipt/ReceiptScreen';
import { RequireUser } from '@/lib/require-user';

export default function Receipt() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RequireUser>{id ? <ReceiptScreen paymentId={asPaymentId(id)} /> : null}</RequireUser>;
}
