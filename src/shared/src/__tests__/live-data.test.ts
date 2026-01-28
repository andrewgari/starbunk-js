import { describe, it, expect } from 'vitest';
import { LiveData } from '../utils/live-data';

describe('LiveData', () => {
  it('emits current value immediately when emitImmediately is true', () => {
    const ld = new LiveData<number>(0);
    const values: number[] = [];
    const unsub = ld.subscribe(v => values.push(v), { emitImmediately: true });
    ld.setValue(1);
    unsub();
    expect(values).toEqual([0, 1]);
  });

  it('does not emit when setting the same value (Object.is)', () => {
    const ld = new LiveData<number>(5);
    const values: number[] = [];
    const unsub = ld.subscribe(v => values.push(v));
    ld.setValue(5); // same by Object.is
    ld.setValue(6);
    unsub();
    expect(values).toEqual([6]);
  });

  it('continues notifying other subscribers if one throws', () => {
    const ld = new LiveData<string>('a');
    const values: string[] = [];
    const bad = () => {
      throw new Error('listener error');
    };
    const unsub1 = ld.subscribe(bad);
    const unsub2 = ld.subscribe(v => values.push(v));
    ld.setValue('b');
    unsub1();
    unsub2();
    expect(values).toEqual(['b']);
  });

  it('asReadonly exposes read-only contract', () => {
    const ld = new LiveData<boolean>(false);
    const ro = ld.asReadonly();
    expect(ro.getValue()).toBe(false);
    let last = false;
    const unsub = ro.subscribe(v => (last = v), { emitImmediately: true });
    expect(last).toBe(false);
    ld.setValue(true);
    expect(last).toBe(true);
    unsub();
  });
});
