import { logger } from '../observability/logger';
import type { LLMService } from './llm-service';
import { GeminiProvider } from './providers/gemini-provider';
import { OllamaProvider } from './providers/ollama-provider';

// Supported provider identifiers for BlueBot
export type BlueBotProviderName = 'gemini' | 'ollama';

function normalizeProviderName(raw?: string | null): BlueBotProviderName | undefined {
	if (!raw) return undefined;
	const value = raw.trim().toLowerCase();
	if (value === 'gemini' || value === 'ollama') {
		return value;
	}
	return undefined;
}

function getProviderOrderFromEnv(): BlueBotProviderName[] {
	const raw = process.env.LLM_PROVIDER;
	const normalized = normalizeProviderName(raw);

	if (raw && !normalized) {
		logger.warn(
			`[BlueBot] Invalid LLM_PROVIDER value "${raw}". Falling back to default provider order (ollama -> gemini).`,
		);
	}

	// Default to Ollama first to match existing BlueBot docs, with Gemini as secondary
	const preferred: BlueBotProviderName = normalized ?? 'ollama';

	return preferred === 'ollama' ? ['ollama', 'gemini'] : ['gemini', 'ollama'];
}

function createProviderInstance(name: BlueBotProviderName): LLMService {
	switch (name) {
		case 'gemini':
			return new GeminiProvider();
		case 'ollama':
			return new OllamaProvider();
		default: {
			// Typescript exhaustiveness guard
			const exhaustiveCheck: never = name;
			throw new Error(`Unsupported BlueBot LLM provider: ${exhaustiveCheck}`);
		}
	}
}

/**
 * Create and initialize an LLM provider for BlueBot based on environment.
 *
 * Behaviour:
 * - If LLM_PROVIDER is set to "gemini" or "ollama", that provider is tried first.
 * - If LLM_PROVIDER is unset or invalid, we default to trying Ollama, then Gemini.
 * - If the first provider fails to initialize, we log and automatically fall back
 *   to the other provider.
 * - If both fail, we throw and let startup fail fast with a clear error.
 */
export async function createConfiguredLLMProvider(): Promise<LLMService> {
	const providerOrder = getProviderOrderFromEnv();
	let lastError: unknown = null;

	for (const name of providerOrder) {
		try {
			logger.info(`[BlueBot] Attempting to initialize LLM provider "${name}"...`);
			const provider = createProviderInstance(name);
				await provider.initialize();

				// Log a concise health summary including the default model we expect
				// this provider to use for simple completions.
				const defaultModel =
					name === 'gemini'
						? process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash'
						: process.env.OLLAMA_DEFAULT_MODEL || 'llama3';

				logger.info(
					`[BlueBot] LLM provider "${name}" initialized successfully. ` +
						`Default model: "${defaultModel}"`,
				);
			return provider;
		} catch (error) {
			lastError = error;
			logger.error(`[BlueBot] Failed to initialize LLM provider "${name}"`, error);
		}
	}

	logger.error('[BlueBot] Failed to initialize any LLM provider.', lastError);
	throw new Error('[BlueBot] Failed to initialize any LLM provider');
}

