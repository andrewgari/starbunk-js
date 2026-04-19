/**
 * Recursively freezes an object and all of its nested values.
 *
 * Used to make CovaProfile instances fully immutable at runtime. Personality
 * profiles are loaded once at startup and shared across every incoming message;
 * making them read-only ensures no service can accidentally modify them and
 * introduce state that bleeds across requests.
 *
 * Returns the same object reference (frozen in place), typed as Readonly<T>.
 */
export function deepFreeze<T>(obj: T): Readonly<T> {
  if (typeof obj !== 'object' || obj === null) return obj as Readonly<T>;
  for (const value of Object.values(obj as Record<string, unknown>)) {
    if (typeof value === 'object' && value !== null) deepFreeze(value as object);
  }
  return Object.freeze(obj) as Readonly<T>;
}
