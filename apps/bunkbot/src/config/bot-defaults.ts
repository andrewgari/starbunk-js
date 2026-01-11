/**
 * Default configuration for reply bots
 */
export interface BotDefaults {
	/** Whether bots are enabled by default */
	enabled: boolean;

	/** Default response rate percentage (0-100) */
	responseRate: number;
}

/**
 * Get the default bot configuration
 */
export function getBotDefaults(): BotDefaults {
	return {
		enabled: true,
		responseRate: 100,
	};
}
