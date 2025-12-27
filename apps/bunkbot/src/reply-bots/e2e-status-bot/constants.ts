export const E2E_STATUS_PATTERN = /^\s*e2e\s*:\s*list\s*bots\s*$/i;
export const E2E_LOADED_PREFIX = '[E2E_LOADED_BOTS]';
export const E2E_IDENT_PREFIX = '[E2E_REQUIRED_IDENTITIES]';

// E2E test member IDs - use environment variables with validation
// These should be set in E2E test environment
// Validation happens at usage time, not module load time
export const DEFAULT_VENN_ID = process.env.E2E_ID_VENN || '';
export const DEFAULT_GUY_ID = process.env.E2E_ID_GUY || '';

/**
 * Validates that E2E test IDs are properly configured
 * Call this before using DEFAULT_VENN_ID or DEFAULT_GUY_ID in tests
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
