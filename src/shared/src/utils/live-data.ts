import { logLayer } from '../observability/log-layer';

const logger = logLayer.withPrefix('LiveData');

export type Unsubscribe = () => void;

export interface ReadonlyLiveData<T> {
  getValue(): T;
  subscribe(listener: (value: T) => void, options?: SubscribeOptions): Unsubscribe;
}

export interface SubscribeOptions {
  /** Immediately invoke listener with current value when true. */
  emitImmediately?: boolean;
}

/**
 * Reactive value holder with simple subscription semantics.
 * - Emits to all subscribers when setValue/update changes the value (by reference equality).
 * - Subscribers can opt to receive the current value immediately via emitImmediately.
 */
export class LiveData<T> implements ReadonlyLiveData<T> {
  private value: T;
  private readonly listeners: Set<(value: T) => void> = new Set();

  constructor(initial: T) {
    this.value = initial;
  }

  public getValue(): T {
    return this.value;
  }

  /** Replace the current value and notify subscribers if it changed (Object.is). */
  public setValue(next: T): void {
    if (Object.is(this.value, next)) return;
    this.value = next;
    for (const cb of Array.from(this.listeners)) {
      try {
        cb(this.value);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.withError(error).error('LiveData subscriber error');
      }
    }
  }

  /** Set the value by applying a transformation to the previous value. */
  public update(mutator: (prev: T) => T): void {
    this.setValue(mutator(this.value));
  }

  public subscribe(listener: (value: T) => void, options?: SubscribeOptions): Unsubscribe {
    this.listeners.add(listener);
    if (options?.emitImmediately) {
      try {
        listener(this.value);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.withError(error).error('LiveData subscriber error (initial)');
      }
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public asReadonly(): ReadonlyLiveData<T> {
    return {
      getValue: () => this.getValue(),
      subscribe: (listener: (value: T) => void, options?: SubscribeOptions) =>
        this.subscribe(listener, options),
    };
  }
}
