/**
 * Anthropic LLM Provider — Claude models via the Anthropic Messages API.
 *
 * Uses native fetch (no SDK dependency). Only active when ANTHROPIC_API_KEY
 * is set; isAvailable() returns false otherwise so the manager skips it.
 */

import { logLayer } from '../../observability/log-layer';
import { LlmProvider, LlmMessage, LlmCompletionOptions, LlmCompletionResult } from './llm-provider';

const logger = logLayer.withPrefix('AnthropicProvider');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  id: string;
  model: string;
  content: Array<{ type: string; text: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private readonly apiKey: string | null;
  private readonly defaultModel: string;

  constructor(apiKey?: string, defaultModel?: string) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || null;
    this.defaultModel =
      defaultModel || process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-haiku-4-5-20251001';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generateCompletion(
    messages: LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<LlmCompletionResult> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const requestedModel = options.model;
    const model =
      requestedModel && requestedModel.startsWith('claude') ? requestedModel : this.defaultModel;

    // Anthropic requires system prompt as a single top-level field — concatenate all system
    // messages so conversation history, user facts, and engagement context are all included.
    const systemParts = messages.filter(m => m.role === 'system').map(m => m.content);
    const systemMessage = systemParts.length > 0 ? systemParts.join('\n\n') : undefined;
    const conversationMessages: AnthropicMessage[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    logger
      .withMetadata({ model, messageCount: conversationMessages.length })
      .debug('Generating Anthropic completion');

    const body: Record<string, unknown> = {
      model,
      messages: conversationMessages,
      max_tokens: options.maxTokens ?? 500,
      temperature: options.temperature ?? 0.7,
    };
    if (systemMessage) {
      body.system = systemMessage;
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as AnthropicResponse;
    const content = data.content.find(c => c.type === 'text')?.text || '';
    const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

    logger.withMetadata({ model, tokensUsed }).debug('Anthropic completion successful');

    return {
      content,
      model: data.model,
      tokensUsed,
      provider: this.name,
    };
  }
}
