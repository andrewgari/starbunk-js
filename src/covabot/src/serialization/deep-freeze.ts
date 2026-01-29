export function deepFreeze<T>(obj: T): Readonly<T> {
  if (typeof obj !== 'object' || obj === null) return obj as Readonly<T>;
  for (const value of Object.values(obj as Record<string, unknown>)) {
    if (typeof value === 'object' && value !== null) deepFreeze(value as object);
  }
  return Object.freeze(obj) as Readonly<T>;
}
