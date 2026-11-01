import type { TillProblem } from '@zahln/application';

/**
 * What the cashier reads when an action did not go through. Always says
 * whether anything changed. Both actions create an order under a kept key, so
 * after no answer, tapping again never creates a second one.
 */
export function problemKey(problem: TillProblem) {
  if (problem.reason === 'unknown') return 'till.problem.unknownRingUp';
  return `till.problem.${problem.reason}` as const;
}
