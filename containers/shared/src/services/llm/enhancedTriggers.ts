import { Message } from 'discord.js';
import { logger } from '../logger';
import { getLLMManager } from '../bootstrap';
import { LLMProviderType } from './index';
import { PerformanceTimer } from '../../utils/time';
import { weightedRandomResponse, ResponseGenerator } from '../../utils/response';
import type { PromptType, PromptCompletionOptions } from './promptManager';

// Interface describing the minimum memory service capabilities needed
export interface MemoryService {
        generateEnhancedContext?: (
                message: string,
                userId: string,
                channelId: string,
                options?: Record<string, unknown>,
        ) => Promise<{ combinedContext: string; metadata?: Record<string, unknown> }>;
        storeConversation?: (entry: {
                content: string;
                userId: string;
                channelId: string;
                messageType: 'user' | 'bot';
                conversationId: string;
        }) => Promise<void>;
        getConversationContext?: (
                message: string,
                userId: string,
                channelId: string,
                options?: Record<string, unknown>,
        ) => Promise<string | null>;
}

const lastResponseTime = new Map<string, number>();
const setLastResponseTime = (channelId: string) => {
        lastResponseTime.set(channelId, Date.now());
};
const getLastResponseTime = (channelId: string) => {
        return lastResponseTime.get(channelId) || 0;
};

export interface EmulatorFactoryOptions {
        fallbackResponses?: string[];
        completionOptions?: PromptCompletionOptions;
        contextOptions?: Record<string, unknown>;
}

export interface DecisionLogicOptions {
        adjustProbability?: (
                probability: number,
                message: Message,
                context: {
                        decision: boolean;
                        lastResponseMinutes: number;
                        conversationContext?: string | null;
                },
        ) => number;
        completionOptions?: PromptCompletionOptions;
        contextOptions?: Record<string, unknown>;
}

/**
 * Enhanced LLM-based response generator using optional memory service
 */
export function createEnhancedLLMEmulatorResponse(
        promptType: PromptType,
        memoryService?: MemoryService,
        options: EmulatorFactoryOptions = {},
): ResponseGenerator {
        const {
          fallbackResponses = ['I ran into a hiccup. Please try again shortly.'],
          completionOptions,
          contextOptions,
        } = options;

        return async (message: Message): Promise<string> => {
                return await PerformanceTimer.time('enhanced-llm-emulator', async () => {
                        try {
                                logger.debug(`[LLM] Generating enhanced response`);

                                const channelName =
                                        'name' in message.channel && message.channel.name
                                                ? message.channel.name
                                                : 'Direct Message';

                                let enhancedContext: { combinedContext: string } | null = null;
                                if (memoryService?.generateEnhancedContext) {
                                        try {
                                                enhancedContext = await memoryService.generateEnhancedContext(
                                                        message.content,
                                                        message.author.id,
                                                        message.channel.id,
                                                        contextOptions,
                                                );
                                        } catch (err) {
                                                logger.warn(
                                                        `[LLM] Failed generating enhanced context: ${err instanceof Error ? err.message : String(err)}`,
                                                );
                                        }
                                }

                                let userPrompt = `Channel: ${channelName}\nUser: ${message.author.username}\nMessage: ${message.content}`;
                                if (enhancedContext?.combinedContext) {
                                        userPrompt += `\n\n${enhancedContext.combinedContext}`;
                                }
                                userPrompt +=
                                        '\n\nRespond as appropriate to this message, taking into account the personality instructions and the conversation history.';

                                const response = await getLLMManager().createPromptCompletion(promptType, userPrompt, {
                                        temperature: completionOptions?.temperature ?? 0.7,
                                        maxTokens: completionOptions?.maxTokens ?? 250,
                                        providerType: completionOptions?.providerType ?? LLMProviderType.OLLAMA,
                                        fallbackToDefault: true,
                                        contextData: completionOptions?.contextData,
                                });

                                if (response) {
                                        if (memoryService?.storeConversation) {
                                                const conversationId = `${message.channel.id}_${Date.now()}`;
                                                try {
                                                        await memoryService.storeConversation({
                                                                content: message.content,
                                                                userId: message.author.id,
                                                                channelId: message.channel.id,
                                                                messageType: 'user',
                                                                conversationId,
                                                        });
                                                        await memoryService.storeConversation({
                                                                content: response,
                                                                userId: message.client.user.id,
                                                                channelId: message.channel.id,
                                                                messageType: 'bot',
                                                                conversationId,
                                                        });
                                                } catch (err) {
                                                        logger.warn(
                                                                `[LLM] Failed storing conversation: ${err instanceof Error ? err.message : String(err)}`,
                                                        );
                                                }
                                        }

                                        setLastResponseTime(message.channel.id);
                                        return response;
                                }

                                logger.warn('[LLM] Empty LLM response, using fallback');
                                return weightedRandomResponse(fallbackResponses)(message);
                        } catch (error) {
                                logger.error(
                                        `[LLM] Error in enhanced response generation: ${error instanceof Error ? error.message : String(error)}`,
                                );
                                return weightedRandomResponse(fallbackResponses)(message);
                        }
                });
        };
}

/**
 * Enhanced decision logic using optional memory service
 */
export function createEnhancedLLMDecisionLogic(
        promptType: PromptType,
        memoryService?: MemoryService,
        options: DecisionLogicOptions = {},
): (message: Message) => Promise<boolean> {
        const { adjustProbability, completionOptions, contextOptions } = options;

        return async (message: Message): Promise<boolean> => {
                return await PerformanceTimer.time('enhanced-llm-decision', async () => {
                        try {
                                let conversationContext: string | null = null;
                                if (memoryService?.getConversationContext) {
                                        try {
                                                conversationContext = await memoryService.getConversationContext(
                                                        message.content,
                                                        message.author.id,
                                                        message.channel.id,
                                                        contextOptions,
                                                );
                                        } catch (err) {
                                                logger.warn(
                                                        `[LLM] Failed fetching conversation context: ${err instanceof Error ? err.message : String(err)}`,
                                                );
                                        }
                                }

                                const channelName =
                                        'name' in message.channel && message.channel.name
                                                ? message.channel.name
                                                : 'DM';

                                const decisionPrompt = `User message: "${message.content}"\nChannel: ${channelName}\nUser: ${message.author.username}\n${
                                        conversationContext ? `\nRecent conversation context:\n${conversationContext}\n` : ''
                                }\nBased on personality and conversation context, should the bot respond to this message?\nRespond with only "yes" or "no".`;

                                const response = await getLLMManager().createPromptCompletion(promptType, decisionPrompt, {
                                        temperature: completionOptions?.temperature ?? 0.3,
                                        maxTokens: completionOptions?.maxTokens ?? 5,
                                        providerType: completionOptions?.providerType ?? LLMProviderType.OLLAMA,
                                        fallbackToDefault: true,
                                });

                                const decision = response?.toLowerCase().trim() === 'yes';
                                let probability = decision ? 0.8 : 0.2;

                                const lastResponseMinutes =
                                        (Date.now() - getLastResponseTime(message.channel.id)) / (1000 * 60);

                                if (adjustProbability) {
                                        try {
                                                probability = adjustProbability(probability, message, {
                                                        decision,
                                                        lastResponseMinutes,
                                                        conversationContext,
                                                });
                                        } catch (err) {
                                                logger.warn(
                                                        `[LLM] Error in probability adjustment: ${err instanceof Error ? err.message : String(err)}`,
                                                );
                                        }
                                }

                                probability = Math.min(probability, MAX_PROBABILITY_CAP);
                                const shouldRespond = Math.random() < probability;

                                logger.debug(
                                        `[LLM] Decision: LLM=${decision} → probability=${probability.toFixed(2)} → ${
                                                shouldRespond ? 'RESPOND' : "DON'T RESPOND"
                                        }`,
                                );

                                return shouldRespond;
                        } catch (error) {
                                logger.error(
                                        `[LLM] Error in enhanced decision logic: ${error instanceof Error ? error.message : String(error)}`,
                                );
                                return Math.random() < FALLBACK_PROBABILITY;
                        }
                });
        };
}
