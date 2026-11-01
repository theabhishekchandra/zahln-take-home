/** A server record that carries a version which only grows. */
export interface Versioned {
  readonly id: string;
  readonly version: number;
}

/**
 * Keeps whichever view of a record is newer. Responses can arrive late, twice
 * or out of order; an older version must never replace a newer one.
 */
export function newer<T extends Versioned>(current: T | undefined, incoming: T): T {
  if (current && current.id !== incoming.id) {
    throw new Error(`Cannot merge ${incoming.id} into ${current.id}`);
  }
  return current && current.version >= incoming.version ? current : incoming;
}
