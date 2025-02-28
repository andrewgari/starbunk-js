import { OpenAIClient } from '@/openai/openaiClient';
import { Message } from 'discord.js';
import { OpenAI } from 'openai';
import UserID from '../../../discord/userID';
import { botStateService } from '../../../services/botStateService';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { ResponseGenerator, TriggerCondition } from '../botTypes';
import ReplyBot from '../replyBot';
import { AllConditions } from '../triggers/conditions/allConditions';
import { BlueAICondition } from '../triggers/conditions/blueAICondition';
import { CooldownCondition } from '../triggers/conditions/cooldownCondition';
import { OneCondition } from '../triggers/conditions/oneCondition';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';
import { UserMessageCondition } from '../triggers/conditions/userMessageCondition';

// Avatar URLs
const DEFAULT_AVATAR = 'https://imgur.com/WcBRCWn.png';
const CHEEKY_AVATAR = 'https://i.imgur.com/dO4a59n.png';
const MURDER_AVATAR = 'https://imgur.com/Tpo8Ywd.jpg';

// State persistence keys
export const BLUEBOT_TIMESTAMP_KEY = 'bluebot_last_initial_message_time';

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
		return `${name}, I think you're really blu! :wink:`;
	}
}

/**
 * Custom response generator for the initial "Did somebody say Blu" message
 * Records the timestamp when this message was sent
 */
class InitialBluResponseGenerator implements ResponseGenerator {
	async generateResponse(): Promise<string> {
		// Record the timestamp when this message was sent
		botStateService.setState(BLUEBOT_TIMESTAMP_KEY, Date.now());
		return "Did somebody say Blu";
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
		const lastMessageTime = botStateService.getState<number>(BLUEBOT_TIMESTAMP_KEY, 0);

		// If we've never sent the message or the timestamp is invalid, return false
		if (!lastMessageTime) return false;

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
		return "Somebody definitely said blu";
	}
}

/**
 * Custom response generator for Navy Seal copypasta
 */
class NavySealResponseGenerator implements ResponseGenerator {
	private readonly navySealText = "What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Academia d'Azul, and I've been involved in numerous secret raids on Western La Noscea, and I have over 300 confirmed kills. I've trained with gorillas in warfare and I'm the top bombardier in the entire Eorzean Alliance. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Shard, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of tonberries across Eorzea and your IP is being traced right now so you better prepare for the storm, macaroni boy. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bear-hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the Eorzean Blue Brigade and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little \"clever\" comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will fucking cook you like the little macaroni boy you are. You're fucking dead, kiddo.";

	async generateResponse(): Promise<string> {
		return this.navySealText;
	}
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

	// Build bot with the new conversation flow pattern
	const bot = new BotBuilder('BlueBot', webhookService)
		.withAvatar(DEFAULT_AVATAR)
		// Initial response that records the timestamp
		.withConditionResponse(
			initialResponseGenerator,
			DEFAULT_AVATAR,
			new OneCondition(
				new PatternCondition(Patterns.WORD_BLUE),
				new BlueAICondition(OpenAIClient)
			)
		)
		// Cheeky response that requires a recent initial message
		.withConditionResponse(
			cheekyResponseGenerator,
			CHEEKY_AVATAR,
			new AllConditions(
				new OneCondition(
					new PatternCondition(Patterns.WORD_BLUE),
					new PatternCondition(Patterns.BLUEBOT_MEAN_WORDS),
					new PatternCondition(Patterns.BLUEBOT_ACKNOWLEDGMENT)
				),
				recentBluMessageCondition
			)
		)
		// Navy Seal response that requires a recent initial message
		.withConditionResponse(
			navySealResponseGenerator,
			DEFAULT_AVATAR,
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
			DEFAULT_AVATAR,
			new OneCondition(
				niceRequestCondition,
				new PatternCondition(Patterns.BLUEBOT_NICE_REQUEST_NAMED)
			)
		)
		// Mean response about Venn
		.withCustomCondition(
			"No way, Venn can suck my blu cane",
			MURDER_AVATAR,
			new PatternCondition(Patterns.BLUEBOT_MEAN_ABOUT_VENN)
		)
		.build();

	return bot;
}

// Also export as default for compatibility
export default createBlueBot;
