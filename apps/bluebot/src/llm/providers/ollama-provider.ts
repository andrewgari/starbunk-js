import { GenericProvider } from './generic-provider';
import { LLMCompletionOptions } from '../types/llm-completion-options';
import { LLMCompletionResponse } from '../types/llm-completion-response';
import { OllamaGenerateResponse } from '../types/llm-generate-options';

export class OllamaProvider extends GenericProvider {
	// Prefer OLLAMA_API_URL to align with other services; fall back to OLLAMA_BASE_URL and then localhost
	private baseUrl: string = process.env.OLLAMA_API_URL || 'http://localhost:11434';
	private defaultModel: string = process.env.OLLAMA_DEFAULT_MODEL || 'llama3';

	// Communicates with local endpoint via fetch
	protected async callProviderAPI(options: LLMCompletionOptions): Promise<unknown> {
		try {
			const response = await fetch(`${this.baseUrl}/api/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: options.model || this.defaultModel,
					prompt: this.formatPrompt(options.messages), // Merges messages for 'generate' endpoint
					stream: false,
					...(typeof options.temperature === 'number' ? { temperature: options.temperature } : {}),
					...(typeof options.maxTokens === 'number' ? { num_predict: options.maxTokens } : {}),
				}),
			});

			if (!response.ok) {
				const bodyText = await response.text().catch(() => '<unable to read response body>');
				throw new Error(`OllamaProvider HTTP ${response.status} ${response.statusText}: ${bodyText}`);
			}

			return (await response.json()) as OllamaGenerateResponse;
		} catch (error: unknown) {
			const modelName = options.model || this.defaultModel;
			throw new Error(
				`Error calling Ollama at ${this.baseUrl} for model "${modelName}": ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	public getProviderName(): string {
		return 'ollama';
	}

	public getAvailableModels(): string[] {
		return ['llama3', 'llama2', 'mistral', 'codellama'];
	}

	public async initialize(): Promise<boolean> {
		this.initialized = true;
		return true;
	}

	protected parseProviderResponse(response: unknown, options: LLMCompletionOptions): LLMCompletionResponse {
		const ollamaResponse = response as OllamaGenerateResponse;
		return {
			content: ollamaResponse.response || '', // Extracts generated text
			model: ollamaResponse.model || options.model || this.defaultModel,
			provider: this.getProviderName(),
		};
	}

	private formatPrompt(messages: { role: string; content: string }[]): string {
		return messages.map((m) => `${m.role}: ${m.content}`).join('\n');
	}
}
