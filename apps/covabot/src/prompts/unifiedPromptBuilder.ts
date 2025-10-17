import { Message } from 'discord.js';
import { ExampleLoader, CovaMessageExample } from '../cova-bot/exampleLoader';
import { logger } from '@starbunk/shared';

interface ConversationMessage {
    author: string;
    content: string;
    timestamp: Date;
    isBot: boolean;
    isCova: boolean;
}

/**
 * Builds prompts for the unified CovaBot using example-based learning
 * 
 * Philosophy: Show, don't tell
 * - NO explicit personality rules
 * - NO "when to respond" guidelines
 * - ONLY real examples of Cova's messages
 * - Let LLM learn patterns implicitly from examples
 */
export class UnifiedPromptBuilder {
    private exampleLoader: ExampleLoader;

    constructor(exampleLoader?: ExampleLoader) {
        this.exampleLoader = exampleLoader || new ExampleLoader();
    }

    /**
     * Build the complete prompt for the LLM
     * 
     * Structure:
     * 1. All curated examples (50-100)
     * 2. Current conversation context
     * 3. "Cova:" to prompt response
     */
    buildPrompt(currentMessage: Message, recentMessages: ConversationMessage[]): string {
        const examples = this.exampleLoader.getAllExamples();

        const examplesSection = this.formatExamples(examples);
        const conversationSection = this.formatCurrentConversation(recentMessages, currentMessage);

        const prompt = `${examplesSection}

---

${conversationSection}

Cova:`;

        logger.debug(`[UnifiedPromptBuilder] Built prompt with ${examples.length} examples, ${recentMessages.length} context messages`);

        return prompt;
    }

    /**
     * Format examples as conversation snippets
     * 
     * Each example shows:
     * - Conversation context (previous messages)
     * - Current message
     * - Cova's response (or [no response] if null)
     */
    private formatExamples(examples: CovaMessageExample[]): string {
        const formatted = examples.map(ex => {
            // Format conversation context
            const context = ex.conversationContext
                .map(msg => `${msg.author}: ${msg.content}`)
                .join('\n');

            // Format current message
            const current = `${ex.currentMessage.author}: ${ex.currentMessage.content}`;

            // Format Cova's response
            const response = ex.covaResponse !== null ? `Cova: ${ex.covaResponse}` : 'Cova: [no response]';

            // Combine
            return `${context}\n${current}\n${response}`;
        });

        return formatted.join('\n\n---\n\n');
    }

    /**
     * Format current conversation context
     * 
     * Shows recent messages leading up to the current message
     */
    private formatCurrentConversation(
        recentMessages: ConversationMessage[],
        currentMessage: Message
    ): string {
        // Format recent messages
        const context = recentMessages
            .map(msg => {
                // Mark if this is the real Cova (not the bot)
                const prefix = msg.isCova ? '[REAL COVA] ' : '';
                return `${prefix}${msg.author}: ${msg.content}`;
            })
            .join('\n');

        // Format current message
        const current = `${currentMessage.author.username}: ${currentMessage.content}`;

        return `${context}\n${current}`;
    }

    /**
     * Optional: Build prompt with conversation metadata
     * 
     * Includes additional context about conversation dynamics
     * Only use if we find the LLM needs explicit signals
     */
    buildPromptWithMetadata(
        currentMessage: Message,
        recentMessages: ConversationMessage[],
        metadata: {
            conversationVelocity: 'high' | 'medium' | 'low';
            participantCount: number;
            timeSinceCovaSpoke: number;
        }
    ): string {
        const examples = this.exampleLoader.getAllExamples();
        const examplesSection = this.formatExamples(examples);
        const conversationSection = this.formatCurrentConversation(recentMessages, currentMessage);

        // Add metadata section
        const metadataSection = `# CONVERSATION CONTEXT
Recent activity: ${metadata.conversationVelocity} (${metadata.participantCount} participants)
Time since Cova last spoke: ${metadata.timeSinceCovaSpoke} minutes`;

        const prompt = `${examplesSection}

---

${metadataSection}

${conversationSection}

Cova:`;

        return prompt;
    }

    /**
     * Get token count estimate for the prompt
     * Rough estimate: ~4 characters per token
     */
    estimateTokenCount(prompt: string): number {
        return Math.ceil(prompt.length / 4);
    }

    /**
     * Build a minimal prompt with fewer examples
     * Only use if token usage becomes a concern
     */
    buildMinimalPrompt(
        currentMessage: Message,
        recentMessages: ConversationMessage[],
        maxExamples: number = 30
    ): string {
        // Use stratified sampling for diversity
        const examples = this.exampleLoader.getStratifiedSample(Math.ceil(maxExamples / 5));

        const examplesSection = this.formatExamples(examples);
        const conversationSection = this.formatCurrentConversation(recentMessages, currentMessage);

        const prompt = `${examplesSection}

---

${conversationSection}

Cova:`;

        logger.debug(`[UnifiedPromptBuilder] Built minimal prompt with ${examples.length} examples`);

        return prompt;
    }
}

