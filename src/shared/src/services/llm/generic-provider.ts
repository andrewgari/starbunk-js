/**
 * Generic LLM Provider — a unified provider for cloud and local models.
 *
 * Implements LlmProvider and replaces the individual gemini, ollama, openai, and
 * anthropic provider classes. Dispatching logic based on provider type is encapsulated
 * inside this class to simplify architecture and maintenance.
 */

import { logLayer } from '../../observability/log-layer';
import OpenAI from 'openai';
import {
  LlmProvider,
  LlmMessage,
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmProviderType,
} from './llm-provider';

const logger = logLayer.withPrefix('GenericLlmProvider');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  id: string;
  model: string;
  stop_reason?: string;
  content: Array<{ type: string; text: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

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
  done_reason?: string;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class GenericLlmProvider implements LlmProvider {
  readonly name: string;
  private readonly type: LlmProviderType;
  private readonly apiKeyOrUrl: string | null = null;
  private readonly defaultModel: string;
  private readonly client: OpenAI | null = null;

  constructor(type: LlmProviderType, apiKeyOrUrl?: string, defaultModel?: string) {
    this.type = type;
    this.name = type;

    switch (type) {
      case 'gemini': {
        const key = apiKeyOrUrl || process.env.GEMINI_API_KEY || null;
        this.apiKeyOrUrl = key;
        this.client = key ? new OpenAI({ apiKey: key, baseURL: GEMINI_BASE_URL }) : null;
        this.defaultModel = defaultModel || process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash';
        break;
      }
      case 'openai': {
        const key = apiKeyOrUrl || process.env.CLOUD_LLM_API_KEY || null;
        this.apiKeyOrUrl = key;
        this.client = key ? new OpenAI({ apiKey: key }) : null;
        this.defaultModel = defaultModel || process.env.CLOUD_LLM_DEFAULT_MODEL || 'gpt-4o-mini';
        break;
      }
      case 'ollama': {
        this.apiKeyOrUrl =
          apiKeyOrUrl ||
          process.env.OLLAMA_BASE_URL ||
          process.env.LOCAL_LLM_API_KEY ||
          'http://127.0.0.1:11434';
        this.defaultModel =
          defaultModel ||
          process.env.OLLAMA_DEFAULT_MODEL ||
          process.env.LOCAL_LLM_DEFAULT_MODEL ||
          'llama3';
        break;
      }
      case 'anthropic': {
        const key = apiKeyOrUrl || process.env.ANTHROPIC_API_KEY || null;
        this.apiKeyOrUrl = key;
        this.defaultModel =
          defaultModel || process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-haiku-4-5-20251001';
        break;
      }
      default:
        throw new Error(`Unsupported LLM provider type: ${type}`);
    }
  }

  isAvailable(): boolean {
    if (this.type === 'ollama') {
      return !!this.apiKeyOrUrl; // Returns true when API URL is configured (matches legacy behavior)
    }
    return !!this.apiKeyOrUrl;
  }

  async generateCompletion(
    messages: LlmMessage[],
    options: LlmCompletionOptions,
  ): Promise<LlmCompletionResult> {
    if (!this.isAvailable()) {
      throw new Error(`${this.type} provider is not configured/available`);
    }

    const requestedModel = options.model;
    let model = this.defaultModel;

    switch (this.type) {
      case 'gemini': {
        if (requestedModel && requestedModel.startsWith('gemini')) {
          model = requestedModel;
        }
        return this.generateOpenAiCompletion(messages, options, model);
      }
      case 'openai': {
        if (
          requestedModel &&
          (requestedModel.startsWith('gpt-') ||
            requestedModel.startsWith('o1') ||
            requestedModel.startsWith('o3'))
        ) {
          model = requestedModel;
        }
        return this.generateOpenAiCompletion(messages, options, model);
      }
      case 'ollama': {
        if (
          requestedModel &&
          !requestedModel.startsWith('gemini') &&
          !requestedModel.startsWith('claude') &&
          !requestedModel.startsWith('gpt') &&
          !requestedModel.startsWith('o1') &&
          !requestedModel.startsWith('o3')
        ) {
          model = requestedModel;
        }
        return this.generateOllamaCompletion(messages, options, model);
      }
      case 'anthropic': {
        if (requestedModel && requestedModel.startsWith('claude')) {
          model = requestedModel;
        }
        return this.generateAnthropicCompletion(messages, options, model);
      }
    }
  }

  private async generateOpenAiCompletion(
    messages: LlmMessage[],
    options: LlmCompletionOptions,
    model: string,
  ): Promise<LlmCompletionResult> {
    if (!this.client) {
      throw new Error(`${this.type} client is not initialized`);
    }

    logger
      .withMetadata({ provider: this.type, model, messageCount: messages.length })
      .debug(`Generating ${this.type} completion`);

    const completion = await this.client.chat.completions.create({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 1000,
    });

    const content = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens;

    logger
      .withMetadata({ provider: this.type, model, tokensUsed })
      .debug(`${this.type} completion successful`);

    return {
      content,
      model: completion.model,
      tokensUsed,
      provider: this.name,
      finishReason: completion.choices[0]?.finish_reason ?? undefined,
    };
  }

  private async generateOllamaCompletion(
    messages: LlmMessage[],
    options: LlmCompletionOptions,
    model: string,
  ): Promise<LlmCompletionResult> {
    const url = `${this.apiKeyOrUrl}/api/chat`;

    logger
      .withMetadata({ provider: this.type, model, messageCount: messages.length })
      .debug('Generating Ollama completion');

    const ollamaMessages: OllamaChatMessage[] = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const body = {
      model,
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        num_predict: options.maxTokens ?? 1000,
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

    logger
      .withMetadata({ provider: this.type, model, tokensUsed })
      .debug('Ollama completion successful');

    return {
      content: data.message.content,
      model: data.model,
      tokensUsed,
      provider: this.name,
      finishReason: data.done_reason,
    };
  }

  private async generateAnthropicCompletion(
    messages: LlmMessage[],
    options: LlmCompletionOptions,
    model: string,
  ): Promise<LlmCompletionResult> {
    // Anthropic requires system prompt as a single top-level field — concatenate all system
    // messages so conversation history, user facts, and engagement context are all included.
    const systemParts = messages.filter(m => m.role === 'system').map(m => m.content);
    const systemMessage = systemParts.length > 0 ? systemParts.join('\n\n') : undefined;
    const conversationMessages: AnthropicMessage[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    logger
      .withMetadata({ provider: this.type, model, messageCount: conversationMessages.length })
      .debug('Generating Anthropic completion');

    const body: Record<string, unknown> = {
      model,
      messages: conversationMessages,
      max_tokens: options.maxTokens ?? 1000,
      temperature: options.temperature ?? 0.7,
    };
    if (systemMessage) {
      body.system = systemMessage;
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKeyOrUrl!,
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

    logger
      .withMetadata({ provider: this.type, model, tokensUsed })
      .debug('Anthropic completion successful');

    return {
      content,
      model: data.model,
      tokensUsed,
      provider: this.name,
      finishReason: data.stop_reason,
    };
  }
}
