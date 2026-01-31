/**
 * Gemini LLM Provider
 *
 * Google Gemini provider as fallback option.
 * Uses the @google/generative-ai SDK.
 */

import { logLayer } from '../../observability/log-layer';
import { LlmProvider, LlmMessage, LlmCompletionOptions, LlmCompletionResult } from './llm-provider';

const logger = logLayer.withPrefix('GeminiProvider');

// Lazy-loaded Gemini client to avoid requiring the package if not used
let GoogleGenerativeAI: typeof import('@google/generative-ai').GoogleGenerativeAI | null = null;

async function getGeminiClient() {
  if (!GoogleGenerativeAI) {
    const module = await import('@google/generative-ai');
    GoogleGenerativeAI = module.GoogleGenerativeAI;
  }
  return GoogleGenerativeAI;
}

export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  private readonly apiKey: string | undefined;
  private readonly defaultModel: string;

  constructor(apiKey?: string, defaultModel?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
    this.defaultModel = defaultModel || process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.0-flash-exp';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generateCompletion(
    messages: LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<LlmCompletionResult> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = options.model || this.defaultModel;

    logger
      .withMetadata({ model, messageCount: messages.length })
      .debug('Generating Gemini completion');

    const GenAI = await getGeminiClient();
    const genAI = new GenAI(this.apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 500,
      },
    });

    // Convert messages to Gemini format
    // Gemini expects system instructions separately and alternating user/model turns
    const systemMessages = messages.filter(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    // Combine system messages into one instruction
    const systemInstruction = systemMessages.map(m => m.content).join('\n\n');

    // Build conversation history for Gemini
    const history = chatMessages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = geminiModel.startChat({
      systemInstruction: systemInstruction || undefined,
      history: history as import('@google/generative-ai').Content[],
    });

    // Get the last message to send
    const lastMessage = chatMessages[chatMessages.length - 1];
    const prompt = lastMessage?.content || '';

    const result = await chat.sendMessage(prompt);
    const response = result.response;
    const content = response.text();

    // Gemini doesn't provide token counts in the same way
    const tokensUsed = response.usageMetadata?.totalTokenCount;

    logger.withMetadata({ model, tokensUsed }).debug('Gemini completion successful');

    return {
      content,
      model,
      tokensUsed,
      provider: this.name,
    };
  }
}
