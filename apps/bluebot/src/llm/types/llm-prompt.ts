export interface LLMPrompt {
	systemContent: string;
	/**
	 * Given the raw user message, produce the content that should be sent
	 * as the "user" part of the prompt for this prompt type.
	 */
	formatUserMessage: (message: string) => string;
	/** Optional model tuning defaults specific to this prompt. */
	defaultTemperature?: number;
	defaultMaxTokens?: number;
}
