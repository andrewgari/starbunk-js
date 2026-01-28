/**
 * Deep freeze utility to make configuration objects immutable at runtime.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  // If not object-like (null, undefined, primitives), return as-is
  if (Object(obj) !== obj) return obj as Readonly<T>;

  const o = obj as Record<string, unknown>;
  const propNames = Object.getOwnPropertyNames(o);
  for (const name of propNames) {
    const value = o[name];
    if (typeof value === 'object' && value !== null) {
      deepFreeze(value);
    }
  }

  return Object.freeze(obj) as Readonly<T>;
}
