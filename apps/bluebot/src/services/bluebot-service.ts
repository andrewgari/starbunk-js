import { LLMService } from '../llm/llm-service';
import { Message } from 'discord.js';
import { createBlueVibeCheckPrompt } from '../llm/prompts/blue-vibe-check';
import { BlueVibe, parseVibeCheckResponse, VibeCheckResult } from '../types/vibe-check';
import { LLMMessage } from '../llm/types/llm-message';
import { isEnemyUserCached } from '../utils/enemy-users';
import { logger } from '../observability/logger';
export class BlueBotService {
	private llmService: LLMService;

	constructor(llmService: LLMService) {
		this.llmService = llmService;
	}

	public async initialize(): Promise<void> {
		// Avoid double-initializing the underlying provider if it was already
		// initialized by the factory.
		if (!this.llmService.isInitialized()) {
			await this.llmService.initialize();
		}
	}

	public async processMessage(message: Message): Promise<void> {
		// Step 1: Run the vibe check to determine if we should respond
		// This now returns vibe, intensity, AND a suggested response
		const vibeResult = await this.checkVibe(message);

		// Step 2: Determine if we should respond based on intensity
		// Intensity is 1-10, we use it as a percentage (intensity * 10)
		const responseChance = vibeResult.intensity * 10;
		const shouldRespond = Math.random() * 100 < responseChance;

		// If vibe is notBlue and we randomly decided not to respond, skip
		if (vibeResult.vibe === BlueVibe.NotBlue && !shouldRespond) {
			return;
		}

		// For non-notBlue vibes with low intensity, still use probability
		if (vibeResult.intensity < 5 && !shouldRespond) {
			return;
		}

		// If we don't have a suggested response, skip
		if (!vibeResult.response || vibeResult.response.trim() === '') {
			return;
		}

		// Step 3: Use the suggested response from the vibe check
		// The LLM has already determined the appropriate response based on the vibe
		await this.respond(message, vibeResult.response);
	}

	/**
	 * Check the vibe of a message using the LLM
	 */
	private async checkVibe(message: Message): Promise<VibeCheckResult> {
		// Determine if the message author is on BlueBot's enemy list
		const userId = message.author.id;
		const isEnemy = isEnemyUserCached(userId);

		if (isEnemy) {
			logger.debug(`Processing message from enemy user: ${userId}`);
		}

		// Create the appropriate prompt based on enemy status
		const prompt = createBlueVibeCheckPrompt(isEnemy);
		const messages: LLMMessage[] = [
			{ role: 'system', content: prompt.systemContent },
			{ role: 'user', content: prompt.formatUserMessage(message.content) },
		];

		try {
			const response = await this.llmService.createCompletion({
				messages,
				temperature: prompt.defaultTemperature,
				maxTokens: prompt.defaultMaxTokens,
			});

			return parseVibeCheckResponse(response.content);
		} catch {
			// If vibe check fails, default to notBlue with minimal intensity
			return {
				vibe: BlueVibe.NotBlue,
				intensity: 1,
			};
		}
	}

	public async respond(message: Message, response: string): Promise<void> {
		await message.reply(response);
	}
}
