import { ChangePinScreen } from '@/features/profile/ChangePinScreen';
import { RequireUser } from '@/lib/require-user';

export default function ChangePin() {
  return (
    <RequireUser>
      <ChangePinScreen />
    </RequireUser>
  );
}
