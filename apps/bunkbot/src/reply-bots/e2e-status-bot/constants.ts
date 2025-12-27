export const E2E_STATUS_PATTERN = /^\s*e2e\s*:\s*list\s*bots\s*$/i;
export const E2E_LOADED_PREFIX = '[E2E_LOADED_BOTS]';
export const E2E_IDENT_PREFIX = '[E2E_REQUIRED_IDENTITIES]';

// E2E test member IDs - use environment variables with graceful degradation
// These should be set in E2E test environment
// Empty strings are used as defaults to allow the bot to load in all environments
// The E2E status bot will report 'missing' for identities that aren't available
// and E2E tests will skip tests that depend on missing identities
export const DEFAULT_VENN_ID = process.env.E2E_ID_VENN || '';
export const DEFAULT_GUY_ID = process.env.E2E_ID_GUY || '';

/**
 * Validates that E2E test IDs are properly configured
 *
 * NOTE: This function is currently not called because the E2E test framework
 * gracefully handles missing IDs by skipping tests that depend on them.
 * This function is provided for future use if strict validation is needed
 * in specific test scenarios.
 *
 * @throws {Error} If E2E_ID_VENN or E2E_ID_GUY environment variables are not set
 */
export function validateE2ETestIds(): void {
	if (!DEFAULT_VENN_ID) {
		throw new Error(
			'E2E test configuration error: E2E_ID_VENN environment variable must be set to a non-empty value.',
		);
	}
	if (!DEFAULT_GUY_ID) {
		throw new Error(
			'E2E test configuration error: E2E_ID_GUY environment variable must be set to a non-empty value.',
		);
	}
}
