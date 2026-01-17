// Local utilities for DJCova

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
	MusicPlayer: Symbol('MusicPlayer'),
	DiscordService: Symbol('DiscordService'),
};

export const initializeObservability = async (_service: string) => {
	// Placeholder - returns minimal structure for type compatibility
	return {
		metrics: {} as unknown,
		logger: {} as unknown,
		channelTracker: {} as unknown,
		httpEndpoints: {
			addHealthCheck: (_name: string, _check: () => Promise<unknown>) => {},
		} as unknown,
		config: {} as unknown,
	};
};

export const shutdownObservability = async () => {
	// Placeholder
};

export const createDJCovaMetrics = (_metrics: unknown, _config: unknown) => {
	return {
		cleanup: async () => {},
	};
};

export const isDebugMode = (): boolean => {
	return process.env.DEBUG_MODE === 'true';
};

export const deferInteractionReply = async (interaction: { deferred: boolean; replied: boolean; deferReply(): Promise<void> }) => {
	if (!interaction.deferred && !interaction.replied) {
		await interaction.deferReply();
	}
};
