/**
 * Simplified CovaBot - Single LLM call approach
 *
 * Philosophy: Let the LLM do all the heavy lifting.
 * - One call decides AND responds
 * - Recent message context is sufficient
 * - No probability calculations or heuristics
 * - No vector database or embeddings
 */

import { Message, TextChannel } from 'discord.js';
import { logger, container, ServiceId, WebhookManager } from '@starbunk/shared';
import { getCovaIdentity } from './services/identity';
import { readFileSync } from 'fs';
import { join } from 'path';

interface PersonalityData {
	conversationalStyle: string[];
	commonPhrases: string[];
	topics: string[];
	exampleResponses: Array<{
		context: string;
		response: string;
	}>;
}

export class SimpleCovaBot {
	private webhookManager: WebhookManager | null = null;
	private personality: PersonalityData;
	private ollama: any; // Will initialize when needed

	constructor() {
		// Load personality from simple JSON file
		try {
			const personalityPath = join(__dirname, '../data/personality.json');
			this.personality = JSON.parse(readFileSync(personalityPath, 'utf-8'));
		} catch (error) {
			// Use defaults if file doesn't exist yet
			logger.warn('[SimpleCovaBot] No personality.json found, using defaults');
			this.personality = {
				conversationalStyle: [
					'Casual and friendly',
					'Technical but approachable',
					'Uses short, direct responses',
				],
				commonPhrases: ['fair', 'makes sense', 'lol', 'honestly'],
				topics: ['coding', 'discord bots', 'typescript', 'tech'],
				exampleResponses: [
					{
						context: 'Someone asks a technical question',
						response: 'what are you trying to build?',
					},
				],
			};
		}
	}

	/**
	 * Main message handler - single entry point
	 */
	async processMessage(message: Message): Promise<void> {
		try {
			// Skip bot messages
			if (message.author.bot) return;

			// Get recent channel context (last 20 messages)
			const recentMessages = await this.getRecentMessages(message.channel as TextChannel, 20);

			// Single LLM call - decides AND responds
			const response = await this.getLLMResponse(message, recentMessages);

			// If LLM says to respond, send it
			if (response && response !== 'SKIP') {
				await this.sendMessage(message, response);
			}
		} catch (error) {
			logger.error('[SimpleCovaBot] Error processing message:', error as Error);
		}
	}

	/**
	 * Get recent messages from channel for context
	 */
	private async getRecentMessages(channel: TextChannel, limit: number = 20): Promise<string> {
		try {
			const messages = await channel.messages.fetch({ limit });
			const formatted = Array.from(messages.values())
				.reverse()
				.map((m) => `${m.author.username}: ${m.content}`)
				.join('\n');

			return formatted;
		} catch (error) {
			logger.error('[SimpleCovaBot] Error fetching recent messages:', error as Error);
			return '';
		}
	}

	/**
	 * Single LLM call - decides whether to respond AND generates response
	 */
	private async getLLMResponse(message: Message, recentMessages: string): Promise<string> {
		try {
			// Initialize Ollama if needed
			if (!this.ollama) {
				const { Ollama } = await import('ollama');
				this.ollama = new Ollama({
					host: process.env.OLLAMA_API_URL || 'http://localhost:11434',
				});
			}

			// Build personality context
			const personalityContext = this.buildPersonalityContext();

			// Build the prompt
			const prompt = `You are mimicking Cova in a Discord conversation.

PERSONALITY:
${personalityContext}

RECENT CONVERSATION (last 20 messages):
${recentMessages}

NEW MESSAGE:
${message.author.username}: ${message.content}

CRITICAL INSTRUCTIONS:
1. Read the RECENT CONVERSATION to understand what people are ACTUALLY talking about
2. Decide if Cova would respond based on:
   - Is this relevant to the CURRENT topic being discussed?
   - Would Cova have something meaningful to add to THIS conversation?
   - Does this warrant a response, or is silence better?

3. If responding:
   - Respond to what's ACTUALLY being discussed, stay on topic
   - Match Cova's style: short (1-2 sentences), casual, direct
   - Use Cova's humor naturally when appropriate (dry/sarcastic about tech)
   - Use common phrases naturally ("fair enough", "makes sense", "lol")
   - NEVER force unrelated topics into the conversation
   - NEVER mention personal details unless naturally relevant to current topic
   - Sound like a real person having a conversation, not a bot with programmed responses

4. If Cova WOULD NOT respond:
   - Reply with only: SKIP

YOUR RESPONSE:`;

			const response = await this.ollama.generate({
				model: process.env.OLLAMA_MODEL || 'llama3.2',
				prompt,
				stream: false,
				options: {
					temperature: 0.7,
					top_p: 0.9,
				},
			});

			const text = response.response.trim();

			logger.debug(`[SimpleCovaBot] LLM response: ${text.substring(0, 100)}...`);

			return text;
		} catch (error) {
			logger.error('[SimpleCovaBot] Error getting LLM response:', error as Error);
			return 'SKIP';
		}
	}

	/**
	 * Build personality context string from loaded data
	 */
	private buildPersonalityContext(): string {
		const { conversationalStyle, commonPhrases, topics, exampleResponses, importantRules } = this.personality;

		let context = 'Conversational Style:\n';
		context += conversationalStyle.map((s) => `- ${s}`).join('\n');
		context += '\n\n';

		if (importantRules && importantRules.length > 0) {
			context += 'IMPORTANT RULES:\n';
			context += importantRules.map((r) => `- ${r}`).join('\n');
			context += '\n\n';
		}

		context += 'Common Phrases: ' + commonPhrases.join(', ');
		context += '\n\n';

		context += 'Topics of Interest: ' + topics.join(', ');
		context += '\n\n';

		if (exampleResponses.length > 0) {
			context += 'Example Responses:\n';
			exampleResponses.forEach((ex) => {
				context += `When: ${ex.context}\n`;
				context += `Response: "${ex.response}"\n\n`;
			});
		}

		return context;
	}

	/**
	 * Send message using webhook with Cova's identity
	 */
	private async sendMessage(message: Message, content: string): Promise<void> {
		try {
			if (!(message.channel instanceof TextChannel)) {
				logger.warn('[SimpleCovaBot] Cannot send to non-text channel');
				return;
			}

			// Get Cova's current identity (name/avatar)
			const identity = await getCovaIdentity(message);
			if (!identity) {
				logger.warn('[SimpleCovaBot] Could not get identity');
				return;
			}

			// Lazy-load webhook manager
			if (!this.webhookManager) {
				if (container.has(ServiceId.WebhookService)) {
					this.webhookManager = container.get<WebhookManager>(ServiceId.WebhookService);
				} else {
					logger.warn('[SimpleCovaBot] WebhookService not available');
					return;
				}
			}

			// Send via webhook
			await this.webhookManager.sendMessage(message.channel.id, {
				content,
				username: identity.botName,
				avatarURL: identity.avatarUrl,
			});

			logger.info(`[SimpleCovaBot] Sent response as ${identity.botName}`);
		} catch (error) {
			logger.error('[SimpleCovaBot] Error sending message:', error as Error);
		}
	}
}
