import { setPin } from '@zahln/application';
import { pinProblem } from '@zahln/domain';
import { useTranslation } from '@zahln/i18n';
import { announce, usePinInput } from '@zahln/ui-native';
import { useState } from 'react';

import { useDependencies } from '@/lib/dependencies';

/**
 * Choosing a PIN (screens 20 and 28): type it, then type it again. Weak PINs are
 * refused with the rule they break; a mismatch starts over. Saved only when both match.
 */
export function useNewPin(onSaved: () => void) {
  const { t } = useTranslation();
  const { pin } = useDependencies();
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const input = usePinInput(async (digits, controls) => {
    const fail = (message: string) => {
      controls.reject();
      setError(message);
      announce(message);
    };
    if (first === null) {
      const problem = pinProblem(digits);
      if (problem) return fail(t(`pin.problem.${problem}`));
      setError(null);
      setFirst(digits);
      controls.clear();
      return announce(t('onboarding.confirmTitle'));
    }
    if (digits !== first) {
      setFirst(null);
      return fail(t('onboarding.mismatch'));
    }
    const saved = await setPin(pin, digits);
    if (!saved.ok) {
      setFirst(null);
      return fail(t(`pin.problem.${saved.error}`));
    }
    onSaved();
  });

  return { input, step: first === null ? ('choose' as const) : ('confirm' as const), error };
}
