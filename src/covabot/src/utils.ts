// Local utilities for CovaBot

export const ensureError = (error: unknown): Error => {
	if (error instanceof Error) return error;
	return new Error(String(error));
};

export const validateEnvironment = (config: { required: string[]; optional?: string[] }) => {
	for (const key of config.required) {
		if (!process.env[key]) {
			throw new Error(`Missing required environment variable: ${key}`);
		}
	}
};

export const getDebugMode = (): boolean => {
	return process.env.DEBUG_MODE === 'true';
};

export const getTestingServerIds = (): string[] => {
	const ids = process.env.TESTING_SERVER_IDS;
	return ids ? ids.split(',').map(id => id.trim()) : [];
};

export const getTestingChannelIds = (): string[] => {
	const ids = process.env.TESTING_CHANNEL_IDS;
	return ids ? ids.split(',').map(id => id.trim()) : [];
};

// Simple dependency injection container
const containerRegistry = new Map<symbol, unknown>();

export const container = {
	register: (key: symbol, value: unknown) => {
		containerRegistry.set(key, value);
	},
	resolve: (key: symbol) => {
		return containerRegistry.get(key) || null;
	},
	get: <T = unknown>(key: symbol): T | undefined => {
		return containerRegistry.get(key) as T | undefined;
	},
	has: (key: symbol) => {
		return containerRegistry.has(key);
	},
};

export const ServiceId = {
	DiscordClient: Symbol('DiscordClient'),
	DiscordService: Symbol('DiscordService'),
};

export const shutdownObservability = async () => {
	// Placeholder
};

export const createCovaBotMetrics = (_metrics: unknown, _config: unknown) => {
	return {
		cleanup: async () => {},
	};
};

// Placeholder types
export type CovaBotMetrics = Record<string, unknown>;
export type BotResponseLog = Record<string, unknown>;

