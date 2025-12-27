export const E2E_STATUS_PATTERN = /^\s*e2e\s*:\s*list\s*bots\s*$/i;
export const E2E_LOADED_PREFIX = '[E2E_LOADED_BOTS]';
export const E2E_IDENT_PREFIX = '[E2E_REQUIRED_IDENTITIES]';

// E2E test member IDs - use environment variables, no hardcoded defaults
// These should be set in E2E test environment
export const DEFAULT_VENN_ID = process.env.E2E_ID_VENN || '';
export const DEFAULT_GUY_ID = process.env.E2E_ID_GUY || '';
