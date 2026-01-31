/**
 * LLM Service - Multi-provider LLM integration for response generation
 *
 * Supports Ollama (primary), Gemini (fallback), and OpenAI (fallback).
 */

import { logLayer } from '@starbunk/shared/observability/log-layer';
import { CovaProfile, LlmContext, IGNORE_CONVERSATION_MARKER } from '@/models/memory-types';
import { LlmProviderManager, LlmProviderConfig, LlmMessage } from '@starbunk/shared';

const logger = logLayer.withPrefix('LlmService');

export interface LlmResponse {
  content: string;
  shouldIgnore: boolean;
  tokensUsed: number;
  model: string;
  provider: string;
}

export class LlmService {
  private providerManager: LlmProviderManager;

  constructor(config?: LlmProviderConfig) {
    this.providerManager = new LlmProviderManager(config);
  }

  /**
   * Generate a response using the configured LLM
   */
  async generateResponse(
    profile: CovaProfile,
    context: LlmContext,
    userMessage: string,
    userName: string,
  ): Promise<LlmResponse> {
    const startTime = Date.now();

    logger
      .withMetadata({
        profile_id: profile.id,
        model: profile.llmConfig.model,
        user_message_length: userMessage.length,
      })
      .debug('Generating LLM response');

    // Build the full system prompt
    const systemPrompt = this.buildSystemPrompt(profile, context);

    // Build messages array
    const messages: LlmMessage[] = [{ role: 'system', content: systemPrompt }];

    // Add conversation history if available
    if (context.conversationHistory) {
      messages.push({
        role: 'system',
        content: `Recent conversation:\n${context.conversationHistory}`,
      });
    }

    // Add user facts if available
    if (context.userFacts) {
      messages.push({
        role: 'system',
        content: `What you know about ${userName}:\n${context.userFacts}`,
      });
    }

    // Add the current message
    messages.push({
      role: 'user',
      content: `${userName}: ${userMessage}`,
    });

    try {
      const result = await this.providerManager.generateCompletion(messages, {
        model: profile.llmConfig.model,
        temperature: profile.llmConfig.temperature,
        maxTokens: profile.llmConfig.max_tokens,
      });

      const responseContent = result.content;
      const tokensUsed = result.tokensUsed || 0;
      const duration = Date.now() - startTime;

      // Check for ignore marker
      const shouldIgnore = responseContent.includes(IGNORE_CONVERSATION_MARKER);

      // Apply speech pattern transformations
      const finalContent = shouldIgnore ? '' : this.applySpechPatterns(responseContent, profile);

      logger
        .withMetadata({
          profile_id: profile.id,
          model: result.model,
          provider: result.provider,
          tokens_used: tokensUsed,
          duration_ms: duration,
          should_ignore: shouldIgnore,
          response_length: finalContent.length,
        })
        .debug('LLM response generated');

      return {
        content: finalContent,
        shouldIgnore,
        tokensUsed,
        model: result.model,
        provider: result.provider,
      };
    } catch (error) {
      logger
        .withError(error)
        .withMetadata({
          profile_id: profile.id,
          model: profile.llmConfig.model,
        })
        .error('LLM request failed');

      throw error;
    }
  }

  /**
   * Build the complete system prompt
   */
  private buildSystemPrompt(profile: CovaProfile, context: LlmContext): string {
    const parts: string[] = [profile.personality.systemPrompt];

    // Add traits
    if (profile.personality.traits.length > 0) {
      parts.push(`\nYour personality traits: ${profile.personality.traits.join(', ')}.`);
    }

    // Add interests
    if (profile.personality.interests.length > 0) {
      parts.push(`\nYour areas of interest: ${profile.personality.interests.join(', ')}.`);
    }

    // Add speech style instructions
    const styleInstructions = this.buildStyleInstructions(profile);
    if (styleInstructions) {
      parts.push(`\nStyle: ${styleInstructions}`);
    }

    // Add trait modifiers
    if (context.traitModifiers) {
      parts.push(`\n${context.traitModifiers}`);
    }

    // Add ignore instruction
    parts.push(
      `\nIMPORTANT: If you have nothing meaningful to add to the conversation, respond with exactly "${IGNORE_CONVERSATION_MARKER}" (with no other text).`,
    );

    return parts.join('');
  }

  /**
   * Build speech style instructions from pattern config
   */
  private buildStyleInstructions(profile: CovaProfile): string {
    const instructions: string[] = [];
    const patterns = profile.personality.speechPatterns;

    if (patterns.lowercase) {
      instructions.push('respond in lowercase');
    }

    if (patterns.sarcasmLevel > 0.7) {
      instructions.push('be notably sarcastic');
    } else if (patterns.sarcasmLevel > 0.4) {
      instructions.push('include occasional sarcasm');
    }

    if (patterns.technicalBias > 0.7) {
      instructions.push('use technical language confidently');
    } else if (patterns.technicalBias > 0.4) {
      instructions.push('balance technical and casual language');
    }

    return instructions.join(', ');
  }

  /**
   * Apply speech pattern transformations to the response
   */
  private applySpechPatterns(content: string, profile: CovaProfile): string {
    let result = content;

    // Lowercase transformation
    if (profile.personality.speechPatterns.lowercase) {
      result = result.toLowerCase();
    }

    // Remove IGNORE_CONVERSATION_MARKER if somehow present
    result = result.replace(IGNORE_CONVERSATION_MARKER, '').trim();

    return result;
  }

  /**
   * Check if any LLM provider is available
   */
  isConfigured(): boolean {
    return this.providerManager.hasAvailableProvider();
  }

  /**
   * Get the provider manager for advanced usage
   */
  getProviderManager(): LlmProviderManager {
    return this.providerManager;
  }
}
