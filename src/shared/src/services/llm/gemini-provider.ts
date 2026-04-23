/**
 * Google Gemini LLM Provider — via Google's OpenAI-compatible endpoint.
 *
 * Reuses the openai package by pointing it at Google's compatibility layer,
 * so no additional SDK dependency is needed. Only active when GEMINI_API_KEY
 * is set; isAvailable() returns false otherwise so the manager skips it.
 */

import { logLayer } from '../../observability/log-layer';
import OpenAI from 'openai';
import { LlmProvider, LlmMessage, LlmCompletionOptions, LlmCompletionResult } from './llm-provider';

const logger = logLayer.withPrefix('GeminiProvider');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  private readonly client: OpenAI | null;
  private readonly defaultModel: string;

  constructor(apiKey?: string, defaultModel?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    this.client = key ? new OpenAI({ apiKey: key, baseURL: GEMINI_BASE_URL }) : null;
    this.defaultModel = defaultModel || process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash';
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async generateCompletion(
    messages: LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<LlmCompletionResult> {
    if (!this.client) {
      throw new Error('Gemini API key not configured');
    }

    const requestedModel = options.model;
    const model =
      requestedModel && requestedModel.startsWith('gemini') ? requestedModel : this.defaultModel;

    logger
      .withMetadata({ model, messageCount: messages.length })
      .debug('Generating Gemini completion');

    const completion = await this.client.chat.completions.create({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 500,
    });

    const content = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens;

    logger.withMetadata({ model, tokensUsed }).debug('Gemini completion successful');

    return {
      content,
      model: completion.model,
      tokensUsed,
      provider: this.name,
    };
  }
}
