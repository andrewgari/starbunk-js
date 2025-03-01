import { OpenAIClient } from '@/openai/openaiClient';
import { Message } from 'discord.js';
import { OpenAI } from 'openai';
import UserID from '../../../discord/userID';
import { botStateService } from '../../../services/botStateService';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { BotIdentity, ResponseGenerator, TriggerCondition } from '../botTypes';
import ReplyBot from '../replyBot';
import { AllConditions } from '../triggers/conditions/allConditions';
import { BlueAICondition } from '../triggers/conditions/blueAICondition';
import { CooldownCondition } from '../triggers/conditions/cooldownCondition';
import { NotCondition } from '../triggers/conditions/notCondition';
import { OneCondition } from '../triggers/conditions/oneCondition';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';
import { UserMessageCondition } from '../triggers/conditions/userMessageCondition';

// Avatar URLs
const DEFAULT_AVATAR = 'https://imgur.com/WcBRCWn.png';
const CHEEKY_AVATAR = 'https://i.imgur.com/dO4a59n.png';
const MURDER_AVATAR = 'https://imgur.com/Tpo8Ywd.jpg'; // For Navy Seal copypasta
const MEAN_AVATAR = 'https://imgur.com/Tpo8Ywd.jpg'; // For "mean about venn" response

// State persistence keys
export const BLUEBOT_TIMESTAMP_KEY = 'bluebot_last_initial_message_time';
export const BLUEBOT_LAST_AVATAR_KEY = 'bluebot_last_avatar';

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
		// Store the avatar used for this response
		botStateService.setState(BLUEBOT_LAST_AVATAR_KEY, DEFAULT_AVATAR);
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
	private readonly cheekyResponses = [
		"Somebody definitely said blu!",
		"I HEARD THAT! Someone said BLU!",
		"Did I hear BLU? I definitely heard BLU!",
		"BLU! BLU! BLU! I knew I heard it!",
		"Oh my stars, was that a BLU I heard?!",
		"*excitedly* BLU! Someone said BLU!",
		"You can't hide it from me - I heard BLU!",
		"My blu-dar is going off the charts!",
		"That's right! Keep saying BLU!",
		"BLU is my favorite word and you just said it!",
		"*gasps dramatically* Was that... BLU?!",
		"I'm 100% certain someone mentioned BLU!",
		"The bluest of words has been spoken!",
		"My ears are perfectly tuned to detect BLU!",
		"BLU! BLU! The magical word has been uttered!",
		"*jumps up and down* BLU! BLU! BLU!",
		"Did you just say the B-word?! The BLU word?!",
		"My blu-senses are tingling!",
		"BLUUUUUUUUUUUUUUUUUUU!",
		"*falls out of chair* Someone said BLU again!",
		"The sacred word has been spoken: BLU!",
		"*puts on sunglasses* That's what I call a BLU moment",
		"Stop the presses! Someone said BLU!",
		"*does a little dance* B-L-U! B-L-U!",
		"Blu-tiful! Simply blu-tiful!",
		"*rings bell* ATTENTION EVERYONE! SOMEONE SAID BLU!",
		"I live for these blu moments!",
		"*pretends to faint* The power of BLU is overwhelming!",
		"That's the bluest thing I've heard all day!",
		"*nods vigorously* Yes! Yes! BLU! BLU!",
		"Once you go blu, you never go back!",
		"*points excitedly* I HEARD BLU! RIGHT THERE!",
		"The prophecy is true - someone said BLU!",
		"*adjusts bow tie* Did someone mention my favorite color?",
		"Blu-ming marvelous! Someone said it!",
		"*spins in circles* BLU! BLU! BLU! BLU!",
		"That's what I'm talking about! BLU!",
		"*raises eyebrows* Oh? Oh! BLU! BLU!",
		"Blu-per duper! You said the magic word!",
		"*throws confetti* CONGRATULATIONS! YOU SAID BLU!"
	];

	async generateResponse(): Promise<string> {
		// Store the avatar used for this response
		botStateService.setState(BLUEBOT_LAST_AVATAR_KEY, CHEEKY_AVATAR);

		// Select a random response from the array
		const randomIndex = Math.floor(Math.random() * this.cheekyResponses.length);
		return this.cheekyResponses[randomIndex];
	}
}

/**
 * Custom response generator for Navy Seal copypasta
 */
class NavySealResponseGenerator implements ResponseGenerator {
	private readonly navySealText = "What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Academia d'Azul, and I've been involved in numerous secret raids on Western La Noscea, and I have over 300 confirmed kills. I've trained with gorillas in warfare and I'm the top bombardier in the entire Eorzean Alliance. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Shard, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of tonberries across Eorzea and your IP is being traced right now so you better prepare for the storm, macaroni boy. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bear-hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the Eorzean Blue Brigade and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little \"clever\" comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will fucking cook you like the little macaroni boy you are. You're fucking dead, kiddo.";

	async generateResponse(): Promise<string> {
		// Store the avatar used for this response
		botStateService.setState(BLUEBOT_LAST_AVATAR_KEY, MURDER_AVATAR);
		return this.navySealText;
	}
}

/**
 * Custom identity updater for BlueBot
 * This ensures the correct avatar is used for each condition, even if no response is sent
 */
async function updateBlueBotIdentity(message: Message): Promise<BotIdentity> {
	// Default identity values
	const defaultName = 'BlueBot';
	const defaultAvatarUrl = DEFAULT_AVATAR;

	// Check for Venn's mean messages about blue
	if (message.author.id === UserID.Venn &&
		message.content.match(Patterns.WORD_BLUE) &&
		message.content.match(Patterns.BLUEBOT_MEAN_WORDS)) {

		const recentBluMessage = await new RecentBluMessageCondition(5).shouldTrigger();
		const cooldownOff = await new CooldownCondition(24 * 60, "BlueBot_NavySeal").shouldTrigger();

		if (recentBluMessage && cooldownOff) {
			// Store the avatar used for this condition
			botStateService.setState(BLUEBOT_LAST_AVATAR_KEY, MURDER_AVATAR);
			return {
				name: defaultName,
				avatarUrl: MURDER_AVATAR
			};
		}
	}

	// Check for acknowledgment messages within time window
	if (message.content.match(Patterns.BLUEBOT_ACKNOWLEDGMENT)) {
		const recentBluMessage = await new RecentBluMessageCondition(5).shouldTrigger();
		if (recentBluMessage) {
			// Store the avatar used for this condition
			botStateService.setState(BLUEBOT_LAST_AVATAR_KEY, CHEEKY_AVATAR);
			return {
				name: defaultName,
				avatarUrl: CHEEKY_AVATAR
			};
		}
	}

	// Check for "blu" messages within time window
	if (message.content.match(Patterns.WORD_BLUE)) {
		const recentBluMessage = await new RecentBluMessageCondition(5).shouldTrigger();
		if (recentBluMessage) {
			// Store the avatar used for this condition
			botStateService.setState(BLUEBOT_LAST_AVATAR_KEY, CHEEKY_AVATAR);
			return {
				name: defaultName,
				avatarUrl: CHEEKY_AVATAR
			};
		}
	}

	// Check for "say something nice about Venn" messages
	if (message.content.match(Patterns.BLUEBOT_NICE_REQUEST_VENN)) {
		// Store the avatar used for this condition
		botStateService.setState(BLUEBOT_LAST_AVATAR_KEY, MEAN_AVATAR);
		return {
			name: defaultName,
			avatarUrl: MEAN_AVATAR
		};
	}

	// Check for "say something nice about X" messages
	if (message.content.match(Patterns.BLUEBOT_NICE_REQUEST_NAMED)) {
		// Store the avatar used for this condition
		botStateService.setState(BLUEBOT_LAST_AVATAR_KEY, DEFAULT_AVATAR);
		return {
			name: defaultName,
			avatarUrl: DEFAULT_AVATAR
		};
	}

	// Use the last avatar if available, otherwise use default
	const lastAvatar = botStateService.getState<string>(BLUEBOT_LAST_AVATAR_KEY, defaultAvatarUrl);
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
		.withAvatar(DEFAULT_AVATAR)
		// Add dynamic identity updater to ensure correct avatar is used
		.withDynamicIdentity(DEFAULT_AVATAR, updateBlueBotIdentity)
		// Initial response that records the timestamp
		.withConditionResponse(
			initialResponseGenerator,
			DEFAULT_AVATAR,
			new AllConditions(
				initialTrigger,
				new NotCondition(recentBluMessageCondition) // Only trigger initial response if not within time window
			)
		)
		// Cheeky response for "blu" within time window
		.withConditionResponse(
			cheekyResponseGenerator,
			CHEEKY_AVATAR,
			new AllConditions(
				new PatternCondition(Patterns.WORD_BLUE),
				recentBluMessageCondition
			)
		)
		// Cheeky response for acknowledgment within time window
		.withConditionResponse(
			cheekyResponseGenerator,
			CHEEKY_AVATAR,
			new AllConditions(
				new PatternCondition(Patterns.BLUEBOT_ACKNOWLEDGMENT),
				recentBluMessageCondition
			)
		)
		// Navy Seal response that requires a recent initial message
		.withConditionResponse(
			navySealResponseGenerator,
			MURDER_AVATAR,
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
			niceRequestCondition
		)
		// Mean response about Venn
		.withCustomCondition(
			"No way, Venn can suck my blu cane",
			MEAN_AVATAR,
			new PatternCondition(Patterns.BLUEBOT_NICE_REQUEST_VENN)
		)
		.build();

	return bot;
}

// Also export as default for compatibility
export default createBlueBot;
