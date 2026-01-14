import { LLMService } from '../llm/llm-service';
import { Message } from 'discord.js';
import { blueVibeCheckPrompt } from '../llm/prompts/blue-vibe-check';
import { BlueVibe, parseVibeCheckResponse, VibeCheckResult } from '../types/vibe-check';
import { LLMMessage } from '../llm/types/llm-message';
export class BlueBotService {
	private static instance: BlueBotService;
	private llmService: LLMService;

	private constructor(llmService: LLMService) {
		this.llmService = llmService;
	}

	public static getInstance(llmService: LLMService): BlueBotService {
		if (!BlueBotService.instance) {
			BlueBotService.instance = new BlueBotService(llmService);
			return BlueBotService.instance;
		}

		// As with BlueBotLLMService, fail fast if a different LLMService
		// instance is passed on subsequent calls. This helps catch subtle
		// wiring bugs during startup or tests.
		if (BlueBotService.instance.llmService !== llmService) {
			throw new Error('BlueBotService has already been initialized with a different LLMService instance');
		}

		return BlueBotService.instance;
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
		const prompt = blueVibeCheckPrompt;
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
