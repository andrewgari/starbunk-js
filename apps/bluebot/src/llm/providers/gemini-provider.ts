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
        const model = this.client!.getGenerativeModel({ model: options.model || this.defaultModel });

        // Gemini expects 'model' role instead of 'assistant'
        const history = options.messages.slice(0, -1).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const chat = model.startChat({ history });
        const response = await chat.sendMessage(options.messages[options.messages.length - 1].content);
        return this.parseProvierResponse(response, options);
    }

    protected parseProvierResponse(response: unknown, options: LLMCompletionOptions): LLMCompletionResponse {
        const geminiResponse = response as { response: { text: () => string } };
        return {
            content: geminiResponse.response.text(),
            model: options.model || this.defaultModel,
            provider: this.getProviderName()
        };
    }
}
