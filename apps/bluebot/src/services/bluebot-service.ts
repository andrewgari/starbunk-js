import { LLMService } from '../llm/llm-service';
import { Message } from 'discord.js';
import { buildBlueBotPrompt, PromptType } from '../llm/prompts';
import { LLMMessage } from '../llm/types/llm-message';

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
		// Ordered strategy pipeline:
		// 1) Explicit "say something nice/blue about X" command (with enemy override).
		if (await this.handleNiceCommand(message)) return;

		// 2) Enemy user speaking about Blue/BlueBot (LLM-powered hostile response).
		if (await this.handleEnemyMessage(message)) return;

		// 3) Simple blue keyword mention with 5-minute pleased window.
		if (await this.handleBlueMention(message)) return;

		// 4) Fallback: LLM deceptive detection + strategy response.
		await this.handleLLMStrategy(message);
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

	private async handleLLMStrategy(message: Message): Promise<void> {
		// 1) Detection pass: master prompt + detector prompt.
		const detectionPrompt = buildBlueBotPrompt(
			PromptType.BlueDetector,
			message.content,
		);
		const detectionMessages: LLMMessage[] = [
			{ role: 'system', content: detectionPrompt.systemPrompt },
			{ role: 'user', content: detectionPrompt.userPrompt },
		];
		const detectionResponse = await this.llmService.createCompletion({
			messages: detectionMessages,
			temperature: detectionPrompt.temperature,
			maxTokens: detectionPrompt.maxTokens,
		});
		const detection = detectionResponse.content;

		const normalized = detection.trim().toLowerCase();
		if (normalized !== 'yes') {
			// Not a blue-related message (or the model was unsure) – do nothing.
			return;
		}

		// 2) Strategy pass: master prompt + strategy prompt.
		const strategyPrompt = buildBlueBotPrompt(
			PromptType.BlueStrategy,
			message.content,
		);
		const strategyMessages: LLMMessage[] = [
			{ role: 'system', content: strategyPrompt.systemPrompt },
			{ role: 'user', content: strategyPrompt.userPrompt },
		];
		let reply: string;
		try {
			const strategyResponse = await this.llmService.createCompletion({
				messages: strategyMessages,
				temperature: strategyPrompt.temperature,
				maxTokens: strategyPrompt.maxTokens,
			});
			reply = strategyResponse.content;
		} catch {
			// Fallback to a simple canned response if the strategy call fails.
			reply = BLUE_BOT_DEFAULT_RESPONSE;
		}

		await this.respond(message, reply);
	}

	public async respond(message: Message, response: string): Promise<void> {
		await message.reply(response);
	}
}
