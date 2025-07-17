// LLM Service - AI personality integration with multiple providers
import OpenAI from 'openai';
import axios from 'axios';
import { logger } from '@starbunk/shared';
import { 
  LLMProvider, 
  LLMRequest, 
  LLMResponse, 
  LLMMessage, 
  LLMError,
  PersonalityProfile,
  ConversationContext 
} from '../../types';

/**
 * Service for integrating with various LLM providers for AI personality responses
 */
export class LLMService {
  private providers = new Map<string, LLMProvider>();
  private openaiClients = new Map<string, OpenAI>();
  private defaultProvider: string;

  constructor(providers: LLMProvider[], defaultProvider: string) {
    this.defaultProvider = defaultProvider;
    
    // Initialize providers
    providers.forEach(provider => {
      this.providers.set(provider.name, provider);
      
      // Initialize OpenAI client if needed
      if (provider.type === 'openai' && provider.apiKey) {
        this.openaiClients.set(provider.name, new OpenAI({
          apiKey: provider.apiKey
        }));
      }
    });

    logger.info('✅ LLM Service initialized', {
      providers: providers.map(p => ({ name: p.name, type: p.type, model: p.model })),
      defaultProvider
    });
  }

  /**
   * Generate AI response using specified or default provider
   */
  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const provider = request.provider || this.providers.get(this.defaultProvider);
    if (!provider) {
      throw new LLMError(`Provider not found: ${request.provider?.name || this.defaultProvider}`);
    }

    try {
      // Build system prompt with personality
      const systemPrompt = this.buildSystemPrompt(request.personality, request.context);
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...request.messages
      ];

      const startTime = Date.now();
      let response: LLMResponse;

      switch (provider.type) {
        case 'openai':
          response = await this.generateOpenAIResponse(provider, messages);
          break;
        case 'ollama':
          response = await this.generateOllamaResponse(provider, messages);
          break;
        case 'anthropic':
          response = await this.generateAnthropicResponse(provider, messages);
          break;
        default:
          throw new LLMError(`Unsupported provider type: ${provider.type}`);
      }

      response.metadata.processingTime = Date.now() - startTime;

      logger.debug('🤖 Generated LLM response', {
        provider: provider.name,
        model: provider.model,
        processingTime: response.metadata.processingTime,
        tokenUsage: response.usage
      });

      return response;

    } catch (error) {
      logger.error('Failed to generate LLM response:', error);
      throw new LLMError(`Failed to generate response with ${provider.name}`, error);
    }
  }

  /**
   * Generate response with OpenAI
   */
  private async generateOpenAIResponse(
    provider: LLMProvider, 
    messages: LLMMessage[]
  ): Promise<LLMResponse> {
    const client = this.openaiClients.get(provider.name);
    if (!client) {
      throw new LLMError(`OpenAI client not initialized for ${provider.name}`);
    }

    const completion = await client.chat.completions.create({
      model: provider.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      max_tokens: provider.maxTokens,
      temperature: provider.temperature
    });

    const choice = completion.choices[0];
    if (!choice?.message?.content) {
      throw new LLMError('No response content from OpenAI');
    }

    return {
      content: choice.message.content,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      },
      metadata: {
        model: provider.model,
        provider: provider.name,
        processingTime: 0, // Will be set by caller
        confidence: this.calculateConfidence(choice)
      }
    };
  }

  /**
   * Generate response with Ollama
   */
  private async generateOllamaResponse(
    provider: LLMProvider, 
    messages: LLMMessage[]
  ): Promise<LLMResponse> {
    if (!provider.baseUrl) {
      throw new LLMError('Ollama base URL not configured');
    }

    const response = await axios.post(`${provider.baseUrl}/api/chat`, {
      model: provider.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      options: {
        temperature: provider.temperature,
        num_predict: provider.maxTokens
      },
      stream: false
    });

    if (!response.data?.message?.content) {
      throw new LLMError('No response content from Ollama');
    }

    return {
      content: response.data.message.content,
      usage: {
        promptTokens: response.data.prompt_eval_count || 0,
        completionTokens: response.data.eval_count || 0,
        totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0)
      },
      metadata: {
        model: provider.model,
        provider: provider.name,
        processingTime: 0
      }
    };
  }

  /**
   * Generate response with Anthropic Claude
   */
  private async generateAnthropicResponse(
    provider: LLMProvider, 
    messages: LLMMessage[]
  ): Promise<LLMResponse> {
    if (!provider.apiKey) {
      throw new LLMError('Anthropic API key not configured');
    }

    // Anthropic has a different message format
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: provider.model,
      max_tokens: provider.maxTokens,
      temperature: provider.temperature,
      system: systemMessage?.content,
      messages: conversationMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))
    }, {
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }
    });

    if (!response.data?.content?.[0]?.text) {
      throw new LLMError('No response content from Anthropic');
    }

    return {
      content: response.data.content[0].text,
      usage: {
        promptTokens: response.data.usage?.input_tokens || 0,
        completionTokens: response.data.usage?.output_tokens || 0,
        totalTokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0)
      },
      metadata: {
        model: provider.model,
        provider: provider.name,
        processingTime: 0
      }
    };
  }

  /**
   * Build system prompt with personality and context
   */
  private buildSystemPrompt(personality: PersonalityProfile, context?: ConversationContext): string {
    let prompt = `You are ${personality.name}, ${personality.description}\n\n`;

    // Add personality traits
    prompt += 'Your personality traits:\n';
    personality.traits.forEach(trait => {
      prompt += `- ${trait.name}: ${trait.value}/100 - ${trait.description}\n`;
    });

    // Add response style
    const style = personality.responseStyle;
    prompt += '\nYour response style:\n';
    prompt += `- Formality: ${style.formality}/100 (${style.formality > 60 ? 'formal' : 'casual'})\n`;
    prompt += `- Verbosity: ${style.verbosity}/100 (${style.verbosity > 60 ? 'detailed' : 'concise'})\n`;
    prompt += `- Emotiveness: ${style.emotiveness}/100 (${style.emotiveness > 60 ? 'expressive' : 'neutral'})\n`;
    prompt += `- Humor: ${style.humor}/100 (${style.humor > 60 ? 'humorous' : 'serious'})\n`;
    prompt += `- Supportiveness: ${style.supportiveness}/100 (${style.supportiveness > 60 ? 'supportive' : 'neutral'})\n`;

    // Add contextual behaviors
    if (personality.contextualBehaviors.length > 0) {
      prompt += '\nContextual behaviors:\n';
      personality.contextualBehaviors
        .sort((a, b) => b.priority - a.priority)
        .forEach(behavior => {
          prompt += `- ${behavior.context}: ${behavior.behavior}\n`;
        });
    }

    // Add conversation context if available
    if (context) {
      prompt += '\nCurrent conversation context:\n';
      prompt += `- Server: ${context.serverId}\n`;
      prompt += `- Channel: ${context.channelId}\n`;
      
      if (context.userProfile) {
        prompt += `- User: ${context.userProfile.displayName} (${context.userProfile.username})\n`;
        if (context.userProfile.interactionHistory.commonTopics.length > 0) {
          prompt += `- Common topics: ${context.userProfile.interactionHistory.commonTopics.join(', ')}\n`;
        }
      }

      if (context.relevantMemories.length > 0) {
        prompt += '\nRelevant conversation memories:\n';
        context.relevantMemories.slice(0, 3).forEach((memory, index) => {
          prompt += `${index + 1}. ${memory.content.substring(0, 100)}...\n`;
        });
      }
    }

    prompt += '\nImportant guidelines:\n';
    prompt += '- Stay in character based on your personality traits and response style\n';
    prompt += '- Be helpful and engaging while maintaining your personality\n';
    prompt += '- Use the conversation context and memories to provide relevant responses\n';
    prompt += '- Keep responses appropriate for a Discord server environment\n';
    prompt += '- If you don\'t know something, admit it rather than making up information\n';

    return prompt;
  }

  /**
   * Calculate confidence score from OpenAI response
   */
  private calculateConfidence(choice: { finish_reason?: string }): number {
    // Simple confidence calculation based on finish_reason and logprobs if available
    if (choice.finish_reason === 'stop') {
      return 0.9;
    } else if (choice.finish_reason === 'length') {
      return 0.7;
    } else {
      return 0.5;
    }
  }

  /**
   * Get available providers
   */
  getProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Health check for LLM service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const providerStatuses = await Promise.all(
        Array.from(this.providers.values()).map(async provider => {
          try {
            // Test with a simple request
            const testRequest: LLMRequest = {
              messages: [{ role: 'user', content: 'Hello' }],
              provider,
              personality: {
                id: 'test',
                name: 'Test',
                description: 'Test personality',
                traits: [],
                responseStyle: {
                  formality: 50,
                  verbosity: 50,
                  emotiveness: 50,
                  humor: 50,
                  supportiveness: 50
                },
                memoryRetention: {
                  maxMemories: 100,
                  retentionDays: 7,
                  importanceThreshold: 50,
                  autoCleanup: true
                },
                triggerPatterns: [],
                contextualBehaviors: [],
                createdAt: new Date(),
                updatedAt: new Date()
              }
            };

            await this.generateResponse(testRequest);
            return { name: provider.name, status: 'healthy' };
          } catch (error) {
            return { 
              name: provider.name, 
              status: 'unhealthy', 
              error: error instanceof Error ? error.message : 'Unknown error' 
            };
          }
        })
      );

      const healthyCount = providerStatuses.filter(p => p.status === 'healthy').length;
      const isHealthy = healthyCount > 0;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          providers: providerStatuses,
          healthyProviders: healthyCount,
          totalProviders: providerStatuses.length,
          defaultProvider: this.defaultProvider,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
