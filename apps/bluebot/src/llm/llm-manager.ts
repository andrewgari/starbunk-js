import { GenericProvider } from "./providers/generic-provider";
import { LLMCompletionOptions } from "./types/llm-completion-options";
import { LLMCompletionResponse } from "./types/llm-completion-response";
import { logger } from "@/observability/logger";

export class LLMManager {
  private providers = new Map<string, GenericProvider>();

	/**
	 * Register an LLM provider instance under a given name.
	 * The name should match what callers pass via options.provider
	 * (e.g. "ollama", "gemini").
	 */
	public registerProvider(providerName: string, provider: GenericProvider): void {
		this.providers.set(providerName, provider);
	}

		/**
		 * Convenience helper that registers a provider instance using its
		 * own getProviderName() value as the key. This helps avoid
		 * mismatches between registration and lookup names.
		 */
		public registerProviderInstance(provider: GenericProvider): void {
			this.registerProvider(provider.getProviderName(), provider);
		}

  public async getCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
		const primaryName = options.provider || 'ollama';
		let provider = this.providers.get(primaryName);

		if (!provider) {
			logger.error(
				`No LLM provider registered under name "${primaryName}". Attempting fallback "gemini"...`,
			);
			const fallback = this.providers.get('gemini');
			if (!fallback) {
				throw new Error(
					`No LLM providers registered for "${primaryName}" or fallback "gemini".`,
				);
			}
			provider = fallback;
		}

		try {
			return await provider.createCompletion(options);
		} catch (error: Error | unknown) {
			logger.error(
				`LLM failed on provider "${primaryName}", attempting fallback "gemini"...`,
				error,
			);
			const fallback = this.providers.get('gemini');
			if (!fallback || fallback === provider) {
				throw error;
			}
			return fallback.createCompletion(options);
		}
  }
}
