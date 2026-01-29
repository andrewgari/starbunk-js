import { describe, it, expect, vi } from 'vitest';
import { LiveData } from '../utils/live-data';

describe('LiveData', () => {
  describe('constructor', () => {
    it('should initialize with the provided value', () => {
      const liveData = new LiveData(42);
      expect(liveData.getValue()).toBe(42);
    });

    it('should initialize with object values', () => {
      const obj = { name: 'test' };
      const liveData = new LiveData(obj);
      expect(liveData.getValue()).toBe(obj);
    });

    it('should initialize with null', () => {
      const liveData = new LiveData<string | null>(null);
      expect(liveData.getValue()).toBeNull();
    });

    it('should initialize with undefined', () => {
      const liveData = new LiveData<string | undefined>(undefined);
      expect(liveData.getValue()).toBeUndefined();
    });
  });

  describe('getValue', () => {
    it('should return the current value', () => {
      const liveData = new LiveData('hello');
      expect(liveData.getValue()).toBe('hello');
    });
  });

  describe('setValue', () => {
    it('should update the value', () => {
      const liveData = new LiveData(1);
      liveData.setValue(2);
      expect(liveData.getValue()).toBe(2);
    });

    it('should notify subscribers when value changes', () => {
      const liveData = new LiveData(1);
      const listener = vi.fn();
      liveData.subscribe(listener);

      liveData.setValue(2);

      expect(listener).toHaveBeenCalledWith(2);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should not notify subscribers when value is the same (Object.is)', () => {
      const liveData = new LiveData(1);
      const listener = vi.fn();
      liveData.subscribe(listener);

      liveData.setValue(1);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify multiple subscribers', () => {
      const liveData = new LiveData('a');
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      liveData.subscribe(listener1);
      liveData.subscribe(listener2);

      liveData.setValue('b');

      expect(listener1).toHaveBeenCalledWith('b');
      expect(listener2).toHaveBeenCalledWith('b');
    });

    it('should handle subscriber errors gracefully', () => {
      const liveData = new LiveData(1);
      const errorListener = vi.fn(() => {
        throw new Error('Subscriber error');
      });
      const goodListener = vi.fn();

      liveData.subscribe(errorListener);
      liveData.subscribe(goodListener);

      // Should not throw
      expect(() => liveData.setValue(2)).not.toThrow();

      // Both listeners should have been called
      expect(errorListener).toHaveBeenCalledWith(2);
      expect(goodListener).toHaveBeenCalledWith(2);
    });

    it('should detect changes for objects by reference', () => {
      const obj1 = { value: 1 };
      const obj2 = { value: 1 };
      const liveData = new LiveData(obj1);
      const listener = vi.fn();
      liveData.subscribe(listener);

      // Same reference - no notification
      liveData.setValue(obj1);
      expect(listener).not.toHaveBeenCalled();

      // Different reference (even if equal content) - notification
      liveData.setValue(obj2);
      expect(listener).toHaveBeenCalledWith(obj2);
    });

    it('should handle NaN correctly with Object.is', () => {
      const liveData = new LiveData(NaN);
      const listener = vi.fn();
      liveData.subscribe(listener);

      // NaN === NaN is false, but Object.is(NaN, NaN) is true
      liveData.setValue(NaN);
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should transform the value using a mutator function', () => {
      const liveData = new LiveData(5);
      liveData.update(prev => prev * 2);
      expect(liveData.getValue()).toBe(10);
    });

    it('should notify subscribers when transformed value is different', () => {
      const liveData = new LiveData(5);
      const listener = vi.fn();
      liveData.subscribe(listener);

      liveData.update(prev => prev + 1);

      expect(listener).toHaveBeenCalledWith(6);
    });

    it('should not notify when mutator returns same value', () => {
      const liveData = new LiveData(5);
      const listener = vi.fn();
      liveData.subscribe(listener);

      liveData.update(prev => prev);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should work with array transformations', () => {
      const liveData = new LiveData<number[]>([1, 2, 3]);
      liveData.update(prev => [...prev, 4]);
      expect(liveData.getValue()).toEqual([1, 2, 3, 4]);
    });
  });

  describe('subscribe', () => {
    it('should return an unsubscribe function', () => {
      const liveData = new LiveData(1);
      const listener = vi.fn();

      const unsubscribe = liveData.subscribe(listener);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should stop notifications after unsubscribe', () => {
      const liveData = new LiveData(1);
      const listener = vi.fn();

      const unsubscribe = liveData.subscribe(listener);
      liveData.setValue(2);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      liveData.setValue(3);
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should emit immediately when emitImmediately option is true', () => {
      const liveData = new LiveData('initial');
      const listener = vi.fn();

      liveData.subscribe(listener, { emitImmediately: true });

      expect(listener).toHaveBeenCalledWith('initial');
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should not emit immediately when emitImmediately is false', () => {
      const liveData = new LiveData('initial');
      const listener = vi.fn();

      liveData.subscribe(listener, { emitImmediately: false });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should not emit immediately when no options provided', () => {
      const liveData = new LiveData('initial');
      const listener = vi.fn();

      liveData.subscribe(listener);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle immediate emit errors gracefully', () => {
      const liveData = new LiveData('value');
      const errorListener = vi.fn(() => {
        throw new Error('Immediate error');
      });

      expect(() => {
        liveData.subscribe(errorListener, { emitImmediately: true });
      }).not.toThrow();

      expect(errorListener).toHaveBeenCalledWith('value');
    });

    it('should allow the same listener to be added only once', () => {
      const liveData = new LiveData(1);
      const listener = vi.fn();

      liveData.subscribe(listener);
      liveData.subscribe(listener);
      liveData.setValue(2);

      // Set uses reference equality, so same function is only added once
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('asReadonly', () => {
    it('should return an object with getValue', () => {
      const liveData = new LiveData(42);
      const readonly = liveData.asReadonly();

      expect(readonly.getValue()).toBe(42);
    });

    it('should reflect changes made to the original', () => {
      const liveData = new LiveData(1);
      const readonly = liveData.asReadonly();

      liveData.setValue(2);

      expect(readonly.getValue()).toBe(2);
    });

    it('should not expose setValue method', () => {
      const liveData = new LiveData(1);
      const readonly = liveData.asReadonly();

      expect((readonly as unknown as { setValue?: unknown }).setValue).toBeUndefined();
    });

    it('should not expose update method', () => {
      const liveData = new LiveData(1);
      const readonly = liveData.asReadonly();

      expect((readonly as unknown as { update?: unknown }).update).toBeUndefined();
    });

    it('should allow subscribing through readonly interface', () => {
      const liveData = new LiveData('a');
      const readonly = liveData.asReadonly();
      const listener = vi.fn();

      readonly.subscribe(listener);
      liveData.setValue('b');

      expect(listener).toHaveBeenCalledWith('b');
    });

    it('should support emitImmediately through readonly interface', () => {
      const liveData = new LiveData('initial');
      const readonly = liveData.asReadonly();
      const listener = vi.fn();

      readonly.subscribe(listener, { emitImmediately: true });

      expect(listener).toHaveBeenCalledWith('initial');
    });

    it('should return working unsubscribe from readonly interface', () => {
      const liveData = new LiveData(1);
      const readonly = liveData.asReadonly();
      const listener = vi.fn();

      const unsubscribe = readonly.subscribe(listener);
      liveData.setValue(2);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      liveData.setValue(3);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid sequential updates', () => {
      const liveData = new LiveData(0);
      const listener = vi.fn();
      liveData.subscribe(listener);

      for (let i = 1; i <= 100; i++) {
        liveData.setValue(i);
      }

      expect(listener).toHaveBeenCalledTimes(100);
      expect(liveData.getValue()).toBe(100);
    });

    it('should handle unsubscribe during notification', () => {
      const liveData = new LiveData(1);
      const unsubscribeRef = { fn: (() => {}) as () => void };

      const selfUnsubscribingListener = vi.fn(() => {
        unsubscribeRef.fn();
      });
      const otherListener = vi.fn();

      unsubscribeRef.fn = liveData.subscribe(selfUnsubscribingListener);
      liveData.subscribe(otherListener);

      liveData.setValue(2);

      expect(selfUnsubscribingListener).toHaveBeenCalledWith(2);
      expect(otherListener).toHaveBeenCalledWith(2);

      // After self-unsubscribe, only otherListener should be called
      liveData.setValue(3);
      expect(selfUnsubscribingListener).toHaveBeenCalledTimes(1);
      expect(otherListener).toHaveBeenCalledTimes(2);
    });

    it('should work with complex nested objects', () => {
      interface State {
        users: { id: number; name: string }[];
        loading: boolean;
      }

      const liveData = new LiveData<State>({
        users: [],
        loading: false,
      });

      liveData.update(prev => ({
        ...prev,
        users: [...prev.users, { id: 1, name: 'Alice' }],
      }));

      expect(liveData.getValue().users).toHaveLength(1);
      expect(liveData.getValue().users[0].name).toBe('Alice');
    });
  });
});
