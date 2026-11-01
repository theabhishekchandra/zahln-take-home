import { PayFlowScreen } from '@/features/pay/PayFlowScreen';
import { RequireUser } from '@/lib/require-user';

export default function Pay() {
  return (
    <RequireUser>
      <PayFlowScreen />
    </RequireUser>
  );
}
