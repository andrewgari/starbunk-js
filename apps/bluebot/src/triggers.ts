import { Message } from 'discord.js';
import { isDebugMode } from '@starbunk/shared';
import { BLUE_BOT_PATTERNS, BLUE_BOT_RESPONSES, BLUE_BOT_AVATARS, BLUE_BOT_NAME, BLUE_BOT_PROMPTS } from './constants';
import { RedisConfigurationService } from './services/redis-configuration-service';
import { LLMService } from './services/llm-service';

// Lazily create and cache configuration service to avoid Redis init at import time
let cachedConfigService: RedisConfigurationService | null = null;

function getConfigService(): RedisConfigurationService | null {
	if (cachedConfigService) {
		return cachedConfigService;
	}
	try {
		cachedConfigService = new RedisConfigurationService();
	} catch {
		cachedConfigService = null;
	}
	return cachedConfigService;
}

// Get target user ID based on debug mode with safe fallbacks
async function getTargetUserId(): Promise<string | null> {
	// In debug mode, prefer E2E test member ID if available
	if (isDebugMode() && (process.env.E2E_TEST_MEMBER_ID || process.env.E2E_ID_SIGGREAT)) {
		return (process.env.E2E_TEST_MEMBER_ID || process.env.E2E_ID_SIGGREAT) as string;
	}
	const cs = getConfigService();
	if (!cs) return null;
	const targetUsername = isDebugMode() ? 'Cova' : 'Venn';
	return cs.getUserIdByUsername(targetUsername);
}

// Random response selector
function randomResponse(responses: string[]): string {
	return responses[Math.floor(Math.random() * responses.length)];
}

// Check if message is within timeframe
function withinTimeframeOf(timestampGetter: () => number, amount: number, unit: 'm'): (message: Message) => boolean {
	return (message: Message) => {
		const timestamp = timestampGetter();
		const now = message.createdTimestamp;
		const diff = now - timestamp;
		const timeframe = unit === 'm' ? amount * 60 * 1000 : amount * 1000;
		return diff <= timeframe;
	};
}

export interface TriggerResponse {
	shouldRespond: boolean;
	response?: string;
	avatarUrl?: string;
	botName?: string;
}

export class BlueBotTriggers {
	private llmService: LLMService;
	// State to track when blue was mentioned or murder was triggered.
	// These are instance properties so each container instance owns its own timeline.
	private blueTimestamp: Date;
	private blueMurderTimestamp: Date;

	constructor() {
		this.llmService = new LLMService();
		this.blueTimestamp = new Date(Number.MIN_SAFE_INTEGER);
		this.blueMurderTimestamp = new Date(Number.MIN_SAFE_INTEGER);
	}

	async checkAllTriggers(message: Message): Promise<TriggerResponse> {
		// Priority 1: Nice Venn
		const niceVennResult = await this.checkNiceVenn(message);
		if (niceVennResult.shouldRespond) return niceVennResult;

		// Priority 2: Nice (general)
		const niceResult = this.checkNice(message);
		if (niceResult.shouldRespond) return niceResult;

		// Priority 3: Acknowledge Venn Mean
		const ackVennMeanResult = await this.checkAcknowledgeVennMean(message);
		if (ackVennMeanResult.shouldRespond) return ackVennMeanResult;

		// Priority 4: Acknowledge Other
		const ackOtherResult = await this.checkAcknowledgeOther(message);
		if (ackOtherResult.shouldRespond) return ackOtherResult;

		// Priority 5: Blue Mention
		const mentionResult = this.checkBlueMention(message);
		if (mentionResult.shouldRespond) return mentionResult;

		// Priority 6: LLM Detection
		const llmResult = await this.checkLLMDetection(message);
		if (llmResult.shouldRespond) return llmResult;

		return { shouldRespond: false };
	}

	private async checkNiceVenn(message: Message): Promise<TriggerResponse> {
		if (!BLUE_BOT_PATTERNS.Nice.test(message.content)) {
			return { shouldRespond: false };
		}

		const targetUserId = await getTargetUserId();
		if (targetUserId && message.author.id === targetUserId) {
			return {
				shouldRespond: true,
				response: 'No way, Venn can suck my blu cane. :unamused:',
				avatarUrl: BLUE_BOT_AVATARS.Contempt,
				botName: BLUE_BOT_NAME,
			};
		}

		return { shouldRespond: false };
	}

	private checkNice(message: Message): TriggerResponse {
		const match = message.content.match(BLUE_BOT_PATTERNS.Nice);
		if (!match) {
			return { shouldRespond: false };
		}

		const name = match.groups?.n ?? '';
		return {
			shouldRespond: true,
			response: `${name}, I think you're pretty blu :wink:`,
			avatarUrl: BLUE_BOT_AVATARS.Cheeky,
			botName: BLUE_BOT_NAME,
		};
	}

	private async checkAcknowledgeVennMean(message: Message): Promise<TriggerResponse> {
		const matchesConfirmOrMean =
			BLUE_BOT_PATTERNS.Confirm.test(message.content) || BLUE_BOT_PATTERNS.Mean.test(message.content);

		if (!matchesConfirmOrMean) {
			return { shouldRespond: false };
		}

		const targetUserId = await getTargetUserId();
		if (!targetUserId || message.author.id !== targetUserId) {
			return { shouldRespond: false };
		}

		if (!withinTimeframeOf(() => this.blueTimestamp.getTime(), 2, 'm')(message)) {
			return { shouldRespond: false };
		}

		const isMurderMode = withinTimeframeOf(() => this.blueMurderTimestamp.getTime(), 1, 'm')(message);
		if (isMurderMode) {
			this.blueMurderTimestamp = new Date();
			return {
				shouldRespond: true,
				response: BLUE_BOT_RESPONSES.Murder,
				avatarUrl: BLUE_BOT_AVATARS.Murder,
				botName: BLUE_BOT_NAME,
			};
		}

		return {
			shouldRespond: true,
			response: 'Oh, somebody definitely said blue...',
			avatarUrl: BLUE_BOT_AVATARS.Default,
			botName: BLUE_BOT_NAME,
		};
	}

	private async checkAcknowledgeOther(message: Message): Promise<TriggerResponse> {
		const targetUserId = await getTargetUserId();
		if (targetUserId && message.author.id === targetUserId) {
			return { shouldRespond: false };
		}

		const matchesPattern =
			BLUE_BOT_PATTERNS.Confirm.test(message.content) ||
			BLUE_BOT_PATTERNS.Mean.test(message.content) ||
			BLUE_BOT_PATTERNS.Default.test(message.content);

		if (!matchesPattern) {
			return { shouldRespond: false };
		}

		if (!withinTimeframeOf(() => this.blueTimestamp.getTime(), 2, 'm')(message)) {
			return { shouldRespond: false };
		}

		this.blueMurderTimestamp = new Date();
		const isTargetUser = targetUserId ? message.author.id === targetUserId : false;

		return {
			shouldRespond: true,
			response: randomResponse(BLUE_BOT_RESPONSES.Cheeky),
			avatarUrl: isTargetUser ? BLUE_BOT_AVATARS.Murder : BLUE_BOT_AVATARS.Default,
			botName: BLUE_BOT_NAME,
		};
	}

	private checkBlueMention(message: Message): TriggerResponse {
		if (!BLUE_BOT_PATTERNS.Default.test(message.content)) {
			return { shouldRespond: false };
		}

		this.blueTimestamp = new Date();
		return {
			shouldRespond: true,
			response: BLUE_BOT_RESPONSES.Default,
			avatarUrl: BLUE_BOT_AVATARS.Default,
			botName: BLUE_BOT_NAME,
		};
	}

	private async checkLLMDetection(message: Message): Promise<TriggerResponse> {
		const content = message.content.trim();
		if (content.length === 0) {
			return { shouldRespond: false };
		}

		try {
			const detected = await this.llmService.detect(content, BLUE_BOT_PROMPTS.DeceptiveCheck);
			if (detected) {
				return {
					shouldRespond: true,
					response: BLUE_BOT_RESPONSES.Default,
					avatarUrl: BLUE_BOT_AVATARS.Default,
					botName: BLUE_BOT_NAME,
				};
			}
		} catch (error) {
			// LLM detection is optional, don't fail if it errors
			console.error('LLM detection failed:', error);
		}

		return { shouldRespond: false };
	}
}
