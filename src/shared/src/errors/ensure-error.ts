/**
 * Normalizes an unknown thrown value into a proper Error object.
 * Use this in catch blocks where the caught value may not be an Error instance.
 */
export function ensureError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}
