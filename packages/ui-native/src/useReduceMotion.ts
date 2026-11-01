import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True while the system "remove animations" setting is on. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce, () => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => subscription.remove();
  }, []);
  return reduce;
}
