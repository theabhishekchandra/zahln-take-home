import { useEffect, useState } from 'react';

function secondsUntil(deadline: number | null, now: () => number): number {
  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now()) / 1000));
}

/**
 * Whole seconds left until `deadline` (epoch ms), updated every second; never
 * below 0. `now` is the clock the deadline is on: pass the server's for a
 * deadline the server set, such as an order's expiry. Keep it stable.
 */
export function useCountdown(deadline: number | null, now: () => number = Date.now): number {
  const [seconds, setSeconds] = useState(() => secondsUntil(deadline, now));
  useEffect(() => {
    setSeconds(secondsUntil(deadline, now));
    if (deadline === null) return;
    const id = setInterval(() => setSeconds(secondsUntil(deadline, now)), 1000);
    return () => clearInterval(id);
  }, [deadline, now]);
  return seconds;
}
