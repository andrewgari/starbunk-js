import { LLMService } from '../llm/llm-service';
import { Message } from 'discord.js';
import { buildBlueBotPrompt, PromptType } from '../llm/prompts';
import { LLMMessage } from '../llm/types/llm-message';
import { blueVibeCheckPrompt } from '../llm/prompts/blue-vibe-check';
import { BlueVibe, parseVibeCheckResponse, VibeCheckResult } from '../types/vibe-check';

const BLUE_TRIGGER_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// Localized static patterns for BlueBot – copied from the deprecated
// apps/bluebot/src/constants.ts so this service no longer depends on that module.
const BLUE_BOT_PATTERNS = {
	Default: /\b(blu|blue|bl(o+)|azul|blau|bl(u+)|blew)\b/i,
	Confirm:
		/\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|nope|nah|(i did)|(i did not)|(you got it)|(sure did)\b/i,
	// Matches commands like:
	//   "bluebot, say something nice about @User"
	//   "bluebot say something blue about Venn"
	Nice: /blue?bot,? say something (?:nice|blue) about (?<n>.+$)/i,
	Mean: /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i,
	Question: /blue?bot,? (?<q>.+\?)/i,
} as const;

const BLUE_BOT_DEFAULT_RESPONSE = 'Did somebody say Blu?';

// Primary "enemy" user ID for BlueBot (for hostile responses).
// If not set explicitly, we fall back to the E2E Venn ID when available so tests
// and dev setups can still exercise enemy logic.
const BLUEBOT_ENEMY_USER_ID: string | null =
	process.env.BLUEBOT_ENEMY_USER_ID || null;
export class BlueBotService {
	private static instance: BlueBotService;
	private llmService: LLMService;
	private lastBlueTriggerAt: number | null = null;

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
			throw new Error(
				'BlueBotService has already been initialized with a different LLMService instance',
			);
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

		// Step 3: Route to appropriate handler based on vibe type
		switch (vibeResult.vibe) {
			case BlueVibe.BlueRequest: {
				// Handle direct requests (e.g., "say something nice about X")
				const handled = await this.handleNiceCommand(message);
				if (handled) return;
				// If not a nice command, fall through to general handling
				await this.handleBlueResponse(message, vibeResult);
				break;
			}

			case BlueVibe.BlueGeneral:
			case BlueVibe.BlueSneaky:
				// Handle explicit blue mentions with LLM strategy
				await this.handleBlueResponse(message, vibeResult);
				break;

			case BlueVibe.BlueMention:
				// Handle incidental mentions more subtly
				await this.handleBlueMention(message);
				break;

			case BlueVibe.NotBlue:
				// Very rarely respond to non-blue messages (only if we got here via probability)
				// This creates occasional "random" blue responses
				if (vibeResult.intensity >= 2) {
					await this.respond(message, BLUE_BOT_DEFAULT_RESPONSE);
				}
				break;
		}
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

	/**
	 * Handle blue-related messages with appropriate LLM response
	 */
	private async handleBlueResponse(message: Message, _vibeResult: VibeCheckResult): Promise<void> {
		// Check if this is from the enemy user first
		const enemyHandled = await this.handleEnemyMessage(message);
		if (enemyHandled) return;

		// Check for recent triggers to use "pleased" response
		const now = Date.now();
		const hadRecentTrigger =
			this.lastBlueTriggerAt !== null &&
			now - this.lastBlueTriggerAt <= BLUE_TRIGGER_WINDOW_MS;
		this.lastBlueTriggerAt = now;

		// Use pleased prompt if recently triggered, otherwise use strategy prompt
		const promptType = hadRecentTrigger ? PromptType.BluePleased : PromptType.BlueStrategy;
		const prompt = buildBlueBotPrompt(promptType, message.content);

		const messages: LLMMessage[] = [
			{ role: 'system', content: prompt.systemPrompt },
			{ role: 'user', content: prompt.userPrompt },
		];

		try {
			const response = await this.llmService.createCompletion({
				messages,
				temperature: prompt.temperature,
				maxTokens: prompt.maxTokens,
			});
			await this.respond(message, response.content);
		} catch {
			// Fallback to default response if LLM fails
			if (hadRecentTrigger) {
				await this.respond(message, 'Oh, somebody definitely said blue!');
			} else {
				await this.respond(message, BLUE_BOT_DEFAULT_RESPONSE);
			}
		}
	}

	private async handleNiceCommand(message: Message): Promise<boolean> {
			const match = BLUE_BOT_PATTERNS.Nice.exec(message.content);
			if (!match) {
				return false;
			}

			// Prefer an explicit Discord mention so we can @ the correct user ID.
			const mentionedUser = message.mentions?.users?.first
				? message.mentions.users.first()
				: null;
			const enemyId = BLUEBOT_ENEMY_USER_ID;
			const targetId = mentionedUser?.id ?? null;

			// If the target is the configured enemy, respond with contempt instead of kindness.
			if (enemyId && targetId === enemyId) {
				await this.respond(
					message,
					`No way <@${enemyId}> can suck my blu cane. :unamused:`,
				);
				return true;
			}

			// If we have a concrete user mention, tag them directly.
			if (targetId) {
				await this.respond(
					message,
					`<@${targetId}>, I think you're pretty blu :wink:`,
				);
				return true;
			}

			// Fallback: use the captured name from the regex.
			const rawName = match.groups?.n?.trim();
			if (rawName && rawName.length > 0) {
				await this.respond(message, `${rawName}, I think you're pretty blu :wink:`);
				return true;
			}

			// Last resort: be nice to the author.
			const displayName = (message.author as any).displayName || message.author.username;
			await this.respond(message, `${displayName}, I think you're pretty blu :wink:`);
			return true;
		}

	private async handleEnemyMessage(message: Message): Promise<boolean> {
		const enemyId = BLUEBOT_ENEMY_USER_ID;
		if (!enemyId || message.author.id !== enemyId) {
			return false;
		}

		const content = message.content;
		const mentionsBlue =
			BLUE_BOT_PATTERNS.Default.test(content) || /bluebot/i.test(content);
		if (!mentionsBlue) {
			return false;
		}

		const prompt = buildBlueBotPrompt(PromptType.BlueEnemy, content);
		const messages: LLMMessage[] = [
			{ role: 'system', content: prompt.systemPrompt },
			{ role: 'user', content: prompt.userPrompt },
		];

		try {
			const response = await this.llmService.createCompletion({
				messages,
				temperature: prompt.temperature,
				maxTokens: prompt.maxTokens,
			});
			await this.respond(message, response.content);
		} catch {
			// Enemy handling is opportunistic; fall back to a simple canned response.
			await this.respond(message, BLUE_BOT_DEFAULT_RESPONSE);
		}

		return true;
	}

	private async handleBlueMention(message: Message): Promise<boolean> {
		if (!BLUE_BOT_PATTERNS.Default.test(message.content)) {
			return false;
		}

		const now = Date.now();
		const hadRecentTrigger =
			this.lastBlueTriggerAt !== null &&
			now - this.lastBlueTriggerAt <= BLUE_TRIGGER_WINDOW_MS;
		this.lastBlueTriggerAt = now;

		if (hadRecentTrigger) {
			await this.respond(message, 'Oh, somebody definitely said blue!');
		} else {
			await this.respond(message, BLUE_BOT_DEFAULT_RESPONSE);
		}

		return true;
	}



	public async respond(message: Message, response: string): Promise<void> {
		await message.reply(response);
	}
}
