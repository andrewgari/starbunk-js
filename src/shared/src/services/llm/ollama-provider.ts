/**
 * Ollama LLM Provider
 *
 * Primary provider for local LLM inference via Ollama.
 */

import { logLayer } from '../../observability/log-layer';
import {
  LlmProvider,
  LlmMessage,
  LlmCompletionOptions,
  LlmCompletionResult,
} from './llm-provider';

const logger = logLayer.withPrefix('OllamaProvider');

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama';
  private readonly apiUrl: string;
  private readonly defaultModel: string;

  constructor(apiUrl?: string, defaultModel?: string) {
    this.apiUrl = apiUrl || process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';
    this.defaultModel = defaultModel || process.env.OLLAMA_DEFAULT_MODEL || 'llama3';
  }

  isAvailable(): boolean {
    return !!this.apiUrl;
  }

  async generateCompletion(
    messages: LlmMessage[],
    options: LlmCompletionOptions
  ): Promise<LlmCompletionResult> {
    const model = options.model || this.defaultModel;
    const url = `${this.apiUrl}/api/chat`;

    logger.withMetadata({ model, messageCount: messages.length }).debug('Generating Ollama completion');

    const ollamaMessages: OllamaChatMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const body = {
      model,
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 500,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as OllamaChatResponse;

    const tokensUsed = (data.prompt_eval_count || 0) + (data.eval_count || 0);

    logger.withMetadata({ model, tokensUsed }).debug('Ollama completion successful');

    return {
      content: data.message.content,
      model: data.model,
      tokensUsed,
      provider: this.name,
    };
  }
}

