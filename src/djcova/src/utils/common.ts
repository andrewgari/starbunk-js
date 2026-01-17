// Common utilities for DJCova

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

export const isDebugMode = (): boolean => {
	return process.env.DEBUG_MODE === 'true';
};

