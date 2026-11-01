import { loadMonthSummary, type MonthSummary } from '@zahln/application';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useDependencies } from '@/lib/dependencies';
import { useOnline } from '@/lib/use-online';

/**
 * This month's summary, reloaded whenever the screen is shown or the
 * connection returns. Keeps the last good copy when a reload fails, so the
 * offline home still shows activity, with the time it was loaded.
 */
export function useMonthSummary(recentCount = 3): MonthSummary | null {
  const { activity, telemetry } = useDependencies();
  const online = useOnline();
  const [summary, setSummary] = useState<MonthSummary | null>(null);

  const reload = useCallback(() => {
    if (!online) return;
    let active = true;
    loadMonthSummary(activity, recentCount).then(
      (result) => {
        if (active && result.ok) setSummary(result.value);
      },
      (error: unknown) => telemetry.error(error, { where: 'home.summary' }),
    );
    return () => {
      active = false;
    };
  }, [activity, telemetry, recentCount, online]);

  // Runs again when the screen is shown, and when the connection comes back while it is.
  useFocusEffect(reload);

  return summary;
}
