import { Message, TextChannel } from 'discord.js';
import { logger, container, ServiceId, WebhookManager } from '@starbunk/shared';
import { Ollama } from 'ollama';
import { getCovaIdentity, BotIdentity } from '../services/identity';
import { UnifiedPromptBuilder } from '../prompts/unifiedPromptBuilder';
import { ResponseParser, ParsedResponse } from '../utils/responseParser';
import { ExampleLoader } from './exampleLoader';

const COVA_USER_ID = '139592376443338752';

interface ConversationMessage {
    author: string;
    content: string;
    timestamp: Date;
    isBot: boolean;
    isCova: boolean;
}

interface UnifiedCovaBotConfig {
    contextWindowSize?: number; // Number of recent messages to include
    llmModel?: string;
    llmTemperature?: number;
    llmMaxTokens?: number;
    llmTimeout?: number;
    useOllama?: boolean; // true = Ollama, false = OpenAI
}

/**
 * Unified CovaBot implementation using example-based learning
 * 
 * Key principles:
 * - Single LLM call (decision + response combined)
 * - Learn from real message examples (no explicit rules)
 * - Conversational dynamics over topic filtering
 * - Fail silently (no hard-coded fallbacks)
 */
export class UnifiedCovaBot {
    private promptBuilder: UnifiedPromptBuilder;
    private exampleLoader: ExampleLoader;
    private webhookManager: WebhookManager | null = null;
    private ollama: Ollama | null = null;
    private config: Required<UnifiedCovaBotConfig>;

    constructor(config: UnifiedCovaBotConfig = {}) {
        this.config = {
            contextWindowSize: config.contextWindowSize || 15,
            llmModel: config.llmModel || process.env.OLLAMA_MODEL || 'llama3.2',
            llmTemperature: config.llmTemperature || 0.7,
            llmMaxTokens: config.llmMaxTokens || 200,
            llmTimeout: config.llmTimeout || 10000,
            useOllama: config.useOllama !== undefined ? config.useOllama : true,
        };

        this.exampleLoader = new ExampleLoader();
        this.promptBuilder = new UnifiedPromptBuilder(this.exampleLoader);

        if (this.config.useOllama) {
            this.ollama = new Ollama({
                host: process.env.OLLAMA_API_URL || 'http://localhost:11434',
            });
        }

        const stats = this.exampleLoader.getResponseStats();
        logger.info(
            `[UnifiedCovaBot] Initialized with ${stats.total} examples ` +
                `(${stats.responded} responses, ${stats.skipped} skips)`
        );
    }

    /**
     * Main entry point - process a Discord message
     */
    async processMessage(message: Message): Promise<void> {
        try {
            // Skip bot messages
            if (message.author.bot) {
                return;
            }

            // Skip if not a text channel
            if (!(message.channel instanceof TextChannel)) {
                return;
            }

            logger.debug(`[UnifiedCovaBot] Processing message from ${message.author.username}`);

            // Get recent messages for context
            const recentMessages = await this.getRecentMessages(
                message.channel as TextChannel,
                this.config.contextWindowSize
            );

            // Build unified prompt
            const prompt = this.promptBuilder.buildPrompt(message, recentMessages);

            // Log token estimate
            const tokenEstimate = this.promptBuilder.estimateTokenCount(prompt);
            logger.debug(`[UnifiedCovaBot] Prompt token estimate: ${tokenEstimate}`);

            // Single LLM call
            const llmResponse = await this.callLLM(prompt);

            // Parse response
            const parsed = ResponseParser.parse(llmResponse);

            if (!parsed.shouldRespond || !parsed.responseText) {
                logger.debug('[UnifiedCovaBot] Decided not to respond');
                return;
            }

            // Send response
            await this.sendResponse(message, parsed.responseText);
        } catch (error) {
            logger.error('[UnifiedCovaBot] Error processing message:', error);
            // Fail silently - don't respond if there's an error
        }
    }

    /**
     * Get recent messages from channel for context
     */
    private async getRecentMessages(
        channel: TextChannel,
        limit: number
    ): Promise<ConversationMessage[]> {
        try {
            const messages = await channel.messages.fetch({ limit: limit + 1 });

            return Array.from(messages.values())
                .reverse()
                .slice(0, limit) // Exclude current message
                .map(m => ({
                    author: m.author.username,
                    content: m.content,
                    timestamp: m.createdAt,
                    isBot: m.author.bot,
                    isCova: m.author.id === COVA_USER_ID,
                }));
        } catch (error) {
            logger.error('[UnifiedCovaBot] Error fetching recent messages:', error);
            return [];
        }
    }

    /**
     * Call LLM to generate response
     */
    private async callLLM(prompt: string): Promise<string> {
        const startTime = Date.now();

        try {
            if (this.config.useOllama && this.ollama) {
                const response = await this.ollama.generate({
                    model: this.config.llmModel,
                    prompt,
                    stream: false,
                    options: {
                        temperature: this.config.llmTemperature,
                        num_predict: this.config.llmMaxTokens,
                    },
                });

                const duration = Date.now() - startTime;
                logger.debug(`[UnifiedCovaBot] LLM call completed in ${duration}ms`);

                return response.response.trim();
            } else {
                // TODO: Implement OpenAI fallback
                throw new Error('OpenAI provider not yet implemented');
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`[UnifiedCovaBot] LLM call failed after ${duration}ms:`, error);
            throw error;
        }
    }

    /**
     * Send response via webhook with Cova's identity
     */
    private async sendResponse(message: Message, content: string): Promise<void> {
        try {
            // Get Cova's identity
            const identity = await getCovaIdentity(message);
            if (!identity) {
                logger.warn('[UnifiedCovaBot] Could not get identity, skipping response');
                return;
            }

            // Get webhook manager
            if (!this.webhookManager) {
                if (container.has(ServiceId.WebhookService)) {
                    this.webhookManager = container.get<WebhookManager>(ServiceId.WebhookService);
                } else {
                    logger.warn('[UnifiedCovaBot] WebhookService not available');
                    return;
                }
            }

            // Format response for Discord
            const formatted = ResponseParser.formatForDiscord(content);

            // Send via webhook
            await this.webhookManager.sendMessage(message.channel.id, {
                content: formatted,
                username: identity.botName,
                avatarURL: identity.avatarUrl,
            });

            logger.info(
                `[UnifiedCovaBot] Sent response as ${identity.botName}: "${formatted.substring(0, 50)}${formatted.length > 50 ? '...' : ''}"`
            );
        } catch (error) {
            logger.error('[UnifiedCovaBot] Error sending response:', error);
        }
    }

    /**
     * Check if bot should always respond (e.g., direct mention)
     */
    shouldAlwaysRespond(message: Message): boolean {
        // Check for direct mention
        return message.mentions.has(COVA_USER_ID);
    }

    /**
     * Get bot statistics
     */
    getStats(): {
        exampleCount: number;
        exampleStats: { responded: number; skipped: number; total: number };
        config: Required<UnifiedCovaBotConfig>;
    } {
        return {
            exampleCount: this.exampleLoader.getExampleCount(),
            exampleStats: this.exampleLoader.getResponseStats(),
            config: this.config,
        };
    }

    /**
     * Reload examples from file
     * Useful for hot-reloading during development
     */
    reloadExamples(): void {
        this.exampleLoader.reload();
        logger.info('[UnifiedCovaBot] Reloaded examples');
    }
}

