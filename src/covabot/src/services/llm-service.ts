/**
 * LLM Service — builds prompts from personality profiles and generates responses.
 *
 * This service owns the prompt construction logic: it assembles the system
 * prompt from a CovaProfile, injects conversation context, formats engagement
 * signals, and delegates the actual HTTP/API call to LlmProviderManager.
 *
 * Provider selection (Ollama primary → OpenAI fallback) is handled entirely
 * by LlmProviderManager; this service never calls a provider directly.
 */

import { logLayer } from '@starbunk/shared/observability/log-layer';
import {
  CovaProfile,
  EngagementContext,
  LlmContext,
  IGNORE_CONVERSATION_MARKER,
} from '@/models/memory-types';
import { LlmProviderManager, LlmProviderConfig, LlmMessage } from '@starbunk/shared';
import { VERBOSE_LOGGING, LOG_PROMPTS } from '@/utils/verbose-mode';

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

    if (VERBOSE_LOGGING) {
      logger
        .withMetadata({
          profile_id: profile.id,
          model: profile.llmConfig.model,
          temperature: profile.llmConfig.temperature,
          max_tokens: profile.llmConfig.max_tokens,
          user: userName,
          user_message_preview: userMessage.substring(0, 80),
          has_system_prompt: profile.personality.systemPrompt.length > 0,
          traits: profile.personality.traits,
          topic_affinities: profile.personality.topicAffinities,
        })
        .info('Calling LLM');
    } else {
      logger
        .withMetadata({
          profile_id: profile.id,
          model: profile.llmConfig.model,
          user_message_length: userMessage.length,
        })
        .debug('Generating LLM response');
    }

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

    // Add structured engagement context signals
    messages.push({
      role: 'system',
      content: this.buildEngagementBlock(context.engagementContext),
    });

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
      const finalContent = shouldIgnore ? '' : this.applySpeechPatterns(responseContent, profile);

      if (VERBOSE_LOGGING) {
        if (shouldIgnore) {
          logger
            .withMetadata({
              profile_id: profile.id,
              model: result.model,
              provider: result.provider,
              tokens_used: tokensUsed,
              duration_ms: duration,
            })
            .info('LLM returned IGNORE — bot will stay silent');
        } else {
          logger
            .withMetadata({
              profile_id: profile.id,
              model: result.model,
              provider: result.provider,
              tokens_used: tokensUsed,
              duration_ms: duration,
              response_length: finalContent.length,
              response_preview: finalContent.substring(0, 100),
            })
            .info('LLM generated response');
        }
      } else {
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
      }

      if (LOG_PROMPTS) {
        logger
          .withMetadata({
            profile_id: profile.id,
            raw_response: responseContent.substring(0, 500),
          })
          .info('[LOG_PROMPTS] Raw LLM response');
      }

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

    // Traits describe voice and tone — not things to demonstrate
    if (profile.personality.traits.length > 0) {
      parts.push(`\nYour personality: ${profile.personality.traits.join(', ')}.`);
    }

    // Topic affinities — engagement signals, not talking points to broadcast
    const affinities = profile.personality.topicAffinities;
    if (affinities.length > 0) {
      parts.push(
        `\nTopics that naturally draw your attention and make you want to join a conversation:\n${affinities.join(', ')}\nThese help you judge whether a conversation is worth engaging with. They are NOT talking points to broadcast or force into unrelated discussions.`,
      );
    }

    // Background facts — personal details, mentioned rarely and only when natural
    const bgFacts = profile.personality.backgroundFacts;
    if (bgFacts.length > 0) {
      const factLines = bgFacts.map(f => `- ${f}`).join('\n');
      parts.push(
        `\nBackground about you — only bring these up when the conversation genuinely leads there, never force them:\n${factLines}`,
      );
    }

    // Speech style
    const styleInstructions = this.buildStyleInstructions(profile);
    if (styleInstructions) {
      parts.push(`\nStyle: ${styleInstructions}`);
    }

    // Trait modifiers
    if (context.traitModifiers) {
      parts.push(`\n${context.traitModifiers}`);
    }

    // Engagement guidance — full behavioral description replaces single-line IGNORE instruction
    parts.push(
      `\nHow you decide whether to respond:\n\nYou are in a group Discord chat. You participate with natural, human conversational instincts — not on every message, not randomly, but when you genuinely have something to contribute.\n\nRespond when:\n- Someone addresses you directly\n- The conversation touches something you genuinely care about and you have a real reaction, insight, or take to add — not just an excuse to mention your interests\n- There is a natural opening that fits your personality\n\nRespond with exactly "${IGNORE_CONVERSATION_MARKER}" (nothing else) when:\n- Two people are clearly in their own back-and-forth and don't need you\n- The topic is completely outside your world and you have nothing real to offer\n- You would be forcing engagement — looking for excuses to speak rather than having something to say\n- You spoke recently and don't have something new to add\n\nUse ${IGNORE_CONVERSATION_MARKER} generously. A natural participant in a group chat is silent most of the time. Silence when you have nothing to say is better than speaking just to be present.`,
    );

    return parts.join('');
  }

  /**
   * Format the pre-computed engagement signals as a human-readable system message
   * block. Injected as a separate system message so the LLM sees current context
   * separately from the persona prompt and can make a natural engagement decision.
   */
  private buildEngagementBlock(ctx: EngagementContext): string {
    const lines: string[] = ['Current context signals:'];

    lines.push(`- Directly @mentioned: ${ctx.wasMentioned ? 'YES' : 'NO'}`);
    lines.push(`- Name referenced in message: ${ctx.nameReferenced ? 'YES' : 'NO'}`);

    if (ctx.activeParticipants.length === 0) {
      lines.push('- Conversation type: no prior history in this channel');
    } else if (ctx.isDirectExchange && ctx.activeParticipants.length <= 2) {
      const names = ctx.activeParticipants.join(' and ');
      lines.push(`- Conversation type: private exchange between ${names}`);
    } else {
      const names = ctx.activeParticipants.join(', ');
      lines.push(`- Conversation type: group discussion with ${names}`);
    }

    if (ctx.secondsSinceLastResponse === null) {
      lines.push('- I have not responded yet in this conversation window');
    } else if (ctx.secondsSinceLastResponse < 60) {
      lines.push(`- I last responded ${ctx.secondsSinceLastResponse}s ago`);
    } else {
      const minutes = Math.floor(ctx.secondsSinceLastResponse / 60);
      lines.push(`- I last responded ${minutes} minute${minutes !== 1 ? 's' : ''} ago`);
    }

    lines.push(`- Messages in window: ${ctx.conversationMessageCount}`);

    if (ctx.wasMentioned || ctx.nameReferenced) {
      lines.push(
        `\nYou were @mentioned or your name was used. Read the message carefully: if it contains a direct question, request, or is clearly addressed to you, respond. If you are mentioned only incidentally (e.g. someone talking about you rather than to you, or a quick "thanks @you"), use ${IGNORE_CONVERSATION_MARKER}.`,
      );
    } else {
      lines.push(
        `\nWeigh the signals above and use ${IGNORE_CONVERSATION_MARKER} when you have nothing genuine to add.`,
      );
    }

    return lines.join('\n');
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
   * Apply post-processing speech pattern transformations to the raw LLM response.
   * Currently handles: lowercase enforcement and stripping any stray IGNORE marker.
   */
  private applySpeechPatterns(content: string, profile: CovaProfile): string {
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
