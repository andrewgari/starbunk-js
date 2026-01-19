/**
 * OpenAI LLM Provider
 * 
 * OpenAI provider as a fallback option.
 */

import { logLayer } from '@starbunk/shared/observability/log-layer';
import OpenAI from 'openai';
import {
  LlmProvider,
  LlmMessage,
  LlmCompletionOptions,
  LlmCompletionResult,
} from './llm-provider';

const logger = logLayer.withPrefix('OpenAIProvider');

export class OpenAIProvider implements LlmProvider {
  readonly name = 'openai';
  private readonly client: OpenAI | null;
  private readonly defaultModel: string;

  constructor(apiKey?: string, defaultModel?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    this.client = key ? new OpenAI({ apiKey: key }) : null;
    this.defaultModel = defaultModel || process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini';
  }

  isAvailable(): boolean {
    return !!this.client;
  }

  async generateCompletion(
    messages: LlmMessage[],
    options: LlmCompletionOptions
  ): Promise<LlmCompletionResult> {
    if (!this.client) {
      throw new Error('OpenAI API key not configured');
    }

    const model = options.model || this.defaultModel;

    logger.withMetadata({ model, messageCount: messages.length }).debug('Generating OpenAI completion');

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const completion = await this.client.chat.completions.create({
      model,
      messages: openaiMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 500,
    });

    const content = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens;

    logger.withMetadata({ model, tokensUsed }).debug('OpenAI completion successful');

    return {
      content,
      model: completion.model,
      tokensUsed,
      provider: this.name,
    };
  }
}

