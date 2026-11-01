/**
 * A minimal observable value. Controllers keep their state here and screens
 * subscribe with React's `useSyncExternalStore`, so the application layer
 * needs no React.
 */
export class Store<T extends object> {
  private value: T;
  private readonly listeners = new Set<() => void>();

  constructor(initial: T) {
    this.value = initial;
  }

  readonly get = (): T => this.value;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  update(patch: Partial<T>): void {
    this.value = { ...this.value, ...patch };
    for (const listener of this.listeners) listener();
  }

  clearListeners(): void {
    this.listeners.clear();
  }
}
