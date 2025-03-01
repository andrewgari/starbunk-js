import { OpenAIClient } from '@/openai/openaiClient';
import { Message } from 'discord.js';
import { OpenAI } from 'openai';
import UserID from '../../../discord/userID';
import { botStateService } from '../../../services/botStateService';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { BotIdentity, ResponseGenerator, TriggerCondition } from '../botTypes';
import ReplyBot from '../replyBot';
import { AVATAR_URLS, CHEEKY_RESPONSES, DEFAULT_RESPONSES, NAVY_SEAL_RESPONSE, NICE_RESPONSE_TEMPLATE, STATE_KEYS } from '../responses/blueBot.responses';
import { AllConditions } from '../triggers/conditions/allConditions';
import { BlueAICondition } from '../triggers/conditions/blueAICondition';
import { CooldownCondition } from '../triggers/conditions/cooldownCondition';
import { NotCondition } from '../triggers/conditions/notCondition';
import { OneCondition } from '../triggers/conditions/oneCondition';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';
import { UserMessageCondition } from '../triggers/conditions/userMessageCondition';

// Export state persistence keys for tests
export const BLUEBOT_TIMESTAMP_KEY = STATE_KEYS.TIMESTAMP;
export const BLUEBOT_LAST_AVATAR_KEY = STATE_KEYS.LAST_AVATAR;

/**
 * BluNiceRequestCondition - A condition for handling "say something nice about" requests
 * Extracts the name from the pattern's capture group
 */
class BluNiceRequestCondition extends PatternCondition {
	constructor() {
		super(Patterns.BLUEBOT_NICE_REQUEST_NAMED);
	}

	/**
	 * Extract the name from the nice message request
	 *
	 * @param message - The Discord message containing the request
	 * @returns The name mentioned in the message, or "Friend" if no name is found
	 */
	getNameFromMessage(message: Message): string {
		const matches = message.content.match(this.pattern);
		if (!matches?.groups?.n) return 'Friend';
		const name = matches.groups.n.trim();
		if (name.toLowerCase() === 'me') {
			return message.member?.displayName ?? message.author.displayName;
		}
		return name;
	}
}

/**
 * Custom response generator for nice messages
 */
class BluNiceResponseGenerator implements ResponseGenerator {
	private condition: BluNiceRequestCondition;

	constructor(condition: BluNiceRequestCondition) {
		this.condition = condition;
	}

	async generateResponse(message: Message): Promise<string> {
		const name = this.condition.getNameFromMessage(message);
		return NICE_RESPONSE_TEMPLATE.replace('{name}', name);
	}
}

/**
 * Custom response generator for the initial "Did somebody say Blu" message
 * Records the timestamp when this message was sent
 */
class InitialBluResponseGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		// Record the timestamp when this message was sent
		botStateService.setState(STATE_KEYS.TIMESTAMP, Date.now());
		// Store the avatar used for this response
		botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.DEFAULT);
		return DEFAULT_RESPONSES.INITIAL;
	}
}

/**
 * Condition that checks if the bot recently said "Did somebody say Blu"
 * Specifically designed for follow-up responses
 */
class RecentBluMessageCondition implements TriggerCondition {
	private readonly timeWindowMs: number;

	constructor(minutesWindow: number = 5) {
		// Convert minutes to milliseconds
		this.timeWindowMs = minutesWindow * 60 * 1000;
	}

	async shouldTrigger(): Promise<boolean> {
		// Get the timestamp of the last initial message
		const lastMessageTime = botStateService.getState<number>(STATE_KEYS.TIMESTAMP, 0);

		// If we've never sent the message or the timestamp is invalid, return false
		if (lastMessageTime === 0) return false;

		// Check if the message was sent within our time window
		const timeSinceMessage = Date.now() - lastMessageTime;
		return timeSinceMessage < this.timeWindowMs;
	}
}

/**
 * Custom response generator for cheeky "Somebody definitely said blu" message
 */
class CheekyBluResponseGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		// Store the avatar used for this response
		botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.CHEEKY);

		// Select a random response from the array
		const randomIndex = Math.floor(Math.random() * CHEEKY_RESPONSES.length);
		return CHEEKY_RESPONSES[randomIndex];
	}
}

/**
 * Custom response generator for Navy Seal copypasta
 */
class NavySealResponseGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		// Store the avatar used for this response
		botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.MURDER);
		return NAVY_SEAL_RESPONSE;
	}
}

/**
 * Custom identity updater for BlueBot
 * This ensures the correct avatar is used for each condition, even if no response is sent
 */
async function updateBlueBotIdentity(message: Message): Promise<BotIdentity> {
	// Default identity values
	const defaultName = 'BlueBot';
	const defaultAvatarUrl = AVATAR_URLS.DEFAULT;

	// Check for Venn's mean messages about blue
	if (message.author.id === UserID.Venn &&
		message.content.match(Patterns.WORD_BLUE) &&
		message.content.match(Patterns.BLUEBOT_MEAN_WORDS)) {

		const recentBluMessage = await new RecentBluMessageCondition(5).shouldTrigger();
		const cooldownOff = await new CooldownCondition(24 * 60, "BlueBot_NavySeal").shouldTrigger();

		if (recentBluMessage && cooldownOff) {
			// Store the avatar used for this condition
			botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.MURDER);
			return {
				name: defaultName,
				avatarUrl: AVATAR_URLS.MURDER
			};
		}
	}

	// Check for acknowledgment messages within time window
	if (message.content.match(Patterns.BLUEBOT_ACKNOWLEDGMENT)) {
		const recentBluMessage = await new RecentBluMessageCondition(5).shouldTrigger();
		if (recentBluMessage) {
			// Store the avatar used for this condition
			botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.CHEEKY);
			return {
				name: defaultName,
				avatarUrl: AVATAR_URLS.CHEEKY
			};
		}
	}

	// Check for "blu" messages within time window
	if (message.content.match(Patterns.WORD_BLUE)) {
		const recentBluMessage = await new RecentBluMessageCondition(5).shouldTrigger();
		if (recentBluMessage) {
			// Store the avatar used for this condition
			botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.CHEEKY);
			return {
				name: defaultName,
				avatarUrl: AVATAR_URLS.CHEEKY
			};
		}
	}

	// Check for "say something nice about Venn" messages
	if (message.content.match(Patterns.BLUEBOT_NICE_REQUEST_VENN)) {
		// Store the avatar used for this condition
		botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.MEAN);
		return {
			name: defaultName,
			avatarUrl: AVATAR_URLS.MEAN
		};
	}

	// Check for "say something nice about X" messages
	if (message.content.match(Patterns.BLUEBOT_NICE_REQUEST_NAMED)) {
		// Store the avatar used for this condition
		botStateService.setState(STATE_KEYS.LAST_AVATAR, AVATAR_URLS.DEFAULT);
		return {
			name: defaultName,
			avatarUrl: AVATAR_URLS.DEFAULT
		};
	}

	// Use the last avatar if available, otherwise use default
	const lastAvatar = botStateService.getState<string>(STATE_KEYS.LAST_AVATAR, defaultAvatarUrl);
	return {
		name: defaultName,
		avatarUrl: lastAvatar
	};
}

/**
 * Configuration options for BluBot
 */
export interface BluBotConfig {
	webhookService?: WebhookService;
	openAIClient?: OpenAI;
	useAIDetection?: boolean;
}

// Export BlueBot type for tests
export type BlueBot = ReplyBot;

/**
 * BluBot - A bot with specific response logic for messages containing "blue"
 *
 * Updated conversation flow:
 * 1. When someone mentions "blue", the bot responds with "Did somebody say Blu"
 *    and internally records the timestamp
 *
 * 2. After the initial response, if someone acknowledges with blue-related phrases
 *    within 5 minutes, the bot responds with "Somebody definitely said blu"
 *
 * 3. Alternatively, if the user is Venn and uses mean words related to blue
 *    within 5 minutes of the initial message, the bot responds with the Navy Seal
 *    copypasta (limited to once per 24 hours)
 */
// @ts-expect-error - We need to keep the config parameter for test compatibility
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createBlueBot(config: BluBotConfig = {}): ReplyBot {
	// Always use the imported singleton webhookService
	const niceRequestCondition = new BluNiceRequestCondition();
	const niceResponseGenerator = new BluNiceResponseGenerator(niceRequestCondition);

	// Create persistent time conditions
	const recentBluMessageCondition = new RecentBluMessageCondition(5);  // 5 minute window
	const cooldownCondition = new CooldownCondition(24 * 60, "BlueBot_NavySeal");

	// Create custom response generators
	const initialResponseGenerator = new InitialBluResponseGenerator();
	const cheekyResponseGenerator = new CheekyBluResponseGenerator();
	const navySealResponseGenerator = new NavySealResponseGenerator();

	// Check if OpenAI is available
	const useAI = process.env.OPENAI_KEY !== undefined && process.env.OPENAI_KEY !== '';

	// Create the initial trigger condition
	let initialTrigger: TriggerCondition;
	if (useAI) {
		// Use AI detection if available
		initialTrigger = new OneCondition(
			new PatternCondition(Patterns.WORD_BLUE),
			new BlueAICondition(OpenAIClient)
		);
	} else {
		// Fall back to pattern matching only
		initialTrigger = new PatternCondition(Patterns.WORD_BLUE);
	}

	// Build bot with the new conversation flow pattern
	const bot = new BotBuilder('BlueBot', webhookService)
		.withAvatar(AVATAR_URLS.DEFAULT)
		// Add dynamic identity updater to ensure correct avatar is used
		.withDynamicIdentity(AVATAR_URLS.DEFAULT, updateBlueBotIdentity)
		// Initial response that records the timestamp
		.withConditionResponse(
			initialResponseGenerator,
			AVATAR_URLS.DEFAULT,
			new AllConditions(
				initialTrigger,
				new NotCondition(recentBluMessageCondition) // Only trigger initial response if not within time window
			)
		)
		// Cheeky response for "blu" within time window
		.withConditionResponse(
			cheekyResponseGenerator,
			AVATAR_URLS.CHEEKY,
			new AllConditions(
				new PatternCondition(Patterns.WORD_BLUE),
				recentBluMessageCondition
			)
		)
		// Cheeky response for acknowledgment within time window
		.withConditionResponse(
			cheekyResponseGenerator,
			AVATAR_URLS.CHEEKY,
			new AllConditions(
				new PatternCondition(Patterns.BLUEBOT_ACKNOWLEDGMENT),
				recentBluMessageCondition
			)
		)
		// Navy Seal response that requires a recent initial message
		.withConditionResponse(
			navySealResponseGenerator,
			AVATAR_URLS.MURDER,
			new AllConditions(
				new PatternCondition(Patterns.WORD_BLUE),
				new PatternCondition(Patterns.BLUEBOT_MEAN_WORDS),
				new UserMessageCondition(UserID.Venn),
				recentBluMessageCondition,
				cooldownCondition
			)
		)
		// "Say something nice" response
		.withConditionResponse(
			niceResponseGenerator,
			AVATAR_URLS.DEFAULT,
			niceRequestCondition
		)
		// Mean response about Venn
		.withCustomCondition(
			DEFAULT_RESPONSES.NICE_ABOUT_VENN,
			AVATAR_URLS.MEAN,
			new PatternCondition(Patterns.BLUEBOT_NICE_REQUEST_VENN)
		)
		.build();

	return bot;
}

// Also export as default for compatibility
export default createBlueBot;
