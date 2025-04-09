/**
 * Ensures that an unknown error value is converted into an Error object.
 * If the input is already an Error, it returns it directly.
 * Otherwise, it creates a new Error with the string representation of the input.
 *
 * @param error - The value caught in a catch block or otherwise representing an error.
 * @returns An Error object.
 */
export function ensureError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}
	return new Error(String(error));
}
