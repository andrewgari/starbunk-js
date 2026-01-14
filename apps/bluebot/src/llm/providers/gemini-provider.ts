// packages/shared/src/services/llm/providers/geminiProvider.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenericProvider } from './generic-provider';
import { LLMCompletionOptions } from '../types/llm-completion-options';
import { LLMCompletionResponse } from '../types/llm-completion-response';
export class GeminiProvider extends GenericProvider {
	private client: GoogleGenerativeAI | null = null;
	private defaultModel: string = process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash';

	public async initialize(): Promise<boolean> {
		const apiKey = process.env.GEMINI_API_KEY;
		if (!apiKey) {
			throw new Error('GEMINI_API_KEY environment variable is not set');
		}
		this.client = new GoogleGenerativeAI(apiKey);
		this.initialized = true;
		return true;
	}

	public getProviderName(): string {
		return 'gemini';
	}

	public getAvailableModels(): string[] {
		return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'];
	}

		protected async callProviderAPI(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
			// Extract any system messages so we can pass them as Gemini system instructions
			const systemMessages = options.messages.filter((m) => m.role === 'system');
			const nonSystemMessages = options.messages.filter((m) => m.role !== 'system');

			// Gemini expects history roles to be either 'user' or 'model'.
			// Map prior user/assistant turns into the expected format, excluding the
			// most recent non-system message which will be sent via chat.sendMessage.
			const history = nonSystemMessages.slice(0, -1).map((m) => ({
				role: m.role === 'assistant' ? 'model' : 'user',
				parts: [{ text: m.content }],
			}));

			// Convert system messages into a single systemInstruction for Gemini so
			// they are not incorrectly treated as regular user turns.
			const systemInstruction = systemMessages.length
				? {
						role: 'model' as const,
						parts: systemMessages.map((m) => ({ text: m.content })),
					}
				: undefined;

			const model = this.client!.getGenerativeModel({
				model: options.model || this.defaultModel,
				...(systemInstruction ? { systemInstruction } : {}),
			});

			// Map generic options.temperature / maxTokens into Gemini generationConfig.
			const generationConfig: Record<string, unknown> = {};
			if (typeof options.temperature === 'number') {
				generationConfig.temperature = options.temperature;
			}
			if (typeof options.maxTokens === 'number') {
				// Gemini uses maxOutputTokens for the token limit.
				(generationConfig as any).maxOutputTokens = options.maxTokens;
			}

			const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
			const chat = Object.keys(generationConfig).length
				? model.startChat({ history, generationConfig: generationConfig as any })
				: model.startChat({ history });
			const response = await chat.sendMessage(lastMessage.content);
			return this.parseProvierResponse(response, options);
		}

	protected parseProvierResponse(response: unknown, options: LLMCompletionOptions): LLMCompletionResponse {
		const geminiResponse = response as { response: { text: () => string } };
		return {
			content: geminiResponse.response.text(),
			model: options.model || this.defaultModel,
			provider: this.getProviderName(),
		};
	}
}
