export const E2E_STATUS_PATTERN = /^\s*e2e\s*:\s*list\s*bots\s*$/i;
export const E2E_LOADED_PREFIX = '[E2E_LOADED_BOTS]';
export const E2E_IDENT_PREFIX = '[E2E_REQUIRED_IDENTITIES]';

// E2E test member IDs - MUST be set in E2E test environment
// These are validated at module load time to fail fast if missing
export const DEFAULT_VENN_ID = (() => {
	const id = process.env.E2E_ID_VENN;
	if (!id) {
		throw new Error(
			'E2E test configuration error: E2E_ID_VENN environment variable must be set to a non-empty value.',
		);
	}
	return id;
})();

export const DEFAULT_GUY_ID = (() => {
	const id = process.env.E2E_ID_GUY;
	if (!id) {
		throw new Error(
			'E2E test configuration error: E2E_ID_GUY environment variable must be set to a non-empty value.',
		);
	}
	return id;
})();
