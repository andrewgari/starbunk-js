/**
 * Default configuration for bot behaviors
 */

export interface BotDefaults {
	responseRate: number;
	enabled: boolean;
}

export const defaultBotConfig: BotDefaults = {
	responseRate: 50, // Default to 50% response rate
	enabled: true,
};

/**
 * Get the default configuration
 */
export function getBotDefaults(): BotDefaults {
	return { ...defaultBotConfig };
}
