/**
 * Discord Token Utility
 *
 * Provides a centralized way to retrieve Discord bot tokens with smart fallback logic.
 * This allows using a single STARBUNK_TOKEN for all containers by default,
 * while supporting container-specific token overrides when needed.
 *
 * @example
 * // In your container's index.ts:
 * import { getDiscordToken } from '@starbunk/shared/utils/discord-token';
 *
 * const token = getDiscordToken('BUNKBOT');
 * // This will check BUNKBOT_TOKEN first, then fall back to STARBUNK_TOKEN
 */

export interface DiscordTokenOptions {
	/**
	 * The container name (e.g., 'BUNKBOT', 'COVABOT', 'DJCOVA', 'STARBUNK_DND')
	 * This is used to construct the container-specific environment variable name.
	 */
	containerName: string;

	/**
	 * Optional logger function for logging which token is being used.
	 * If not provided, console.info will be used.
	 */
	logger?: {
		info: (message: string) => void;
	};

	/**
	 * Whether to log which token variable is being used.
	 * Default: true
	 */
	enableLogging?: boolean;
}

/**
 * Retrieves the Discord bot token with smart fallback logic.
 *
 * Priority order:
 * 1. Container-specific token (e.g., BUNKBOT_TOKEN)
 * 2. Shared token (STARBUNK_TOKEN)
 * 3. Legacy token (TOKEN) - for backward compatibility
 *
 * @param options - Configuration options or container name string
 * @returns The Discord bot token
 * @throws Error if no token is found
 *
 * @example
 * // Simple usage with just container name
 * const token = getDiscordToken('BUNKBOT');
 *
 * @example
 * // Advanced usage with custom logger
 * const token = getDiscordToken({
 *   containerName: 'BUNKBOT',
 *   logger: myLogger,
 *   enableLogging: true
 * });
 */
export function getDiscordToken(options: string | DiscordTokenOptions): string {
	// Normalize options
	const config: Required<DiscordTokenOptions> =
		typeof options === 'string'
			? {
					containerName: options,
					logger: console,
					enableLogging: true,
				}
			: {
					containerName: options.containerName,
					logger: options.logger || console,
					enableLogging: options.enableLogging ?? true,
				};

	const { containerName, logger, enableLogging } = config;

	// Construct environment variable names
	const containerTokenVar = `${containerName}_TOKEN`;
	const sharedTokenVar = 'STARBUNK_TOKEN';
	const legacyTokenVar = 'TOKEN';

	// Check for tokens in priority order
	const containerToken = process.env[containerTokenVar];
	const sharedToken = process.env[sharedTokenVar];
	const legacyToken = process.env[legacyTokenVar];

	// Determine which token to use
	let token: string | undefined;
	let tokenSource: string;

	if (containerToken) {
		token = containerToken;
		tokenSource = containerTokenVar;
	} else if (sharedToken) {
		token = sharedToken;
		tokenSource = `${sharedTokenVar} (fallback)`;
	} else if (legacyToken) {
		token = legacyToken;
		tokenSource = `${legacyTokenVar} (legacy fallback)`;
	} else {
		// No token found - throw error with helpful message
		throw new Error(
			`Discord token not found. Please set one of the following environment variables:\n` +
				`  1. ${containerTokenVar} (container-specific, recommended for multi-bot setups)\n` +
				`  2. ${sharedTokenVar} (shared token for all containers)\n` +
				`  3. ${legacyTokenVar} (legacy, for backward compatibility)`,
		);
	}

	// Log which token is being used (without exposing the actual token value)
	if (enableLogging) {
		logger.info(`🔑 Using ${tokenSource} for Discord authentication`);
	}

	return token;
}

/**
 * Retrieves the Discord client ID with smart fallback logic.
 *
 * Priority order:
 * 1. Container-specific client ID (e.g., BUNKBOT_CLIENT_ID)
 * 2. Shared client ID (STARBUNK_CLIENT_ID)
 * 3. Legacy client ID (CLIENT_ID) - for backward compatibility
 *
 * @param containerName - The container name (e.g., 'BUNKBOT', 'COVABOT')
 * @returns The Discord client ID
 * @throws Error if no client ID is found
 */
export function getDiscordClientId(containerName: string): string {
	const containerClientIdVar = `${containerName}_CLIENT_ID`;
	const sharedClientIdVar = 'STARBUNK_CLIENT_ID';
	const legacyClientIdVar = 'CLIENT_ID';

	const containerClientId = process.env[containerClientIdVar];
	const sharedClientId = process.env[sharedClientIdVar];
	const legacyClientId = process.env[legacyClientIdVar];

	if (containerClientId) {
		return containerClientId;
	} else if (sharedClientId) {
		return sharedClientId;
	} else if (legacyClientId) {
		return legacyClientId;
	} else {
		throw new Error(
			`Discord client ID not found. Please set one of the following environment variables:\n` +
				`  1. ${containerClientIdVar} (container-specific)\n` +
				`  2. ${sharedClientIdVar} (shared for all containers)\n` +
				`  3. ${legacyClientIdVar} (legacy)`,
		);
	}
}
