import { RefundsScreen } from '@/features/refunds/RefundsScreen';
import { RequireShift } from '@/lib/shift';

export default function RefundsRoute() {
  return (
    <RequireShift>
      <RefundsScreen />
    </RequireShift>
  );
}
