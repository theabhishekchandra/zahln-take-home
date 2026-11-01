import { SaleScreen } from '@/features/sale/SaleScreen';
import { RequireShift } from '@/lib/shift';

export default function RegisterRoute() {
  return (
    <RequireShift>
      <SaleScreen />
    </RequireShift>
  );
}
