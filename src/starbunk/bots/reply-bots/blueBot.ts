import { OpenAIClient } from '@/openai/openaiClient';
import { Message } from 'discord.js';
import { OpenAI } from 'openai';
import UserID from '../../../discord/userID';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { ResponseGenerator } from '../botTypes';
import ReplyBot from '../replyBot';
import { AllConditions } from '../triggers/conditions/allConditions';
import { BlueAICondition } from '../triggers/conditions/blueAICondition';
import { CooldownCondition } from '../triggers/conditions/cooldownCondition';
import { OneCondition } from '../triggers/conditions/oneCondition';
import { PatternCondition } from '../triggers/conditions/patternCondition';
import { Patterns } from '../triggers/conditions/patterns';
import { RecentMessageCondition } from '../triggers/conditions/recentMessageCondition';
import { UserMessageCondition } from '../triggers/conditions/userMessageCondition';

// Avatar URLs
const DEFAULT_AVATAR = 'https://imgur.com/WcBRCWn.png';
const CHEEKY_AVATAR = 'https://i.imgur.com/dO4a59n.png';
const MURDER_AVATAR = 'https://imgur.com/Tpo8Ywd.jpg';

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
		return `${name}, I think you're really blu`;
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

/**
 * BluBot - A bot with specific response logic for messages containing "blue"
 *
 * Priority Rules:
 * P1: The bot will reply with "Did somebody say Blu" if:
 *   1. The blue pattern matches
 *   2. A higher priority pattern doesn't match
 *   3. ChatGPT determines it refers to blue
 *
 * P2: The bot will reply with "Somebody definitely said blu" if:
 *   1. The blue, mean OR acknowledgement patterns match
 *   2. A higher priority pattern doesn't match
 *   3. ChatGPT determines it (blue and/or acknowledgement)
 *   4. The bot's last message was within 5 minutes ago
 *
 * P3: The bot will reply with Navy Seal copypasta if:
 *   1. The mean pattern matches
 *   2. A higher priority pattern doesn't match
 *   3. The person who acknowledged the bot was Venn
 *   4. This bot's last message was within 5 minutes ago
 *   5. The last time this bot sent the Navy Seal meme was longer than 24 hours
 *
 * P4: The Bot will reply "<n>, I think you're really blu" if:
 *   1. Someone uses the phrase "bluebot, say something nice about <n>"
 *   2. A higher priority pattern doesn't match
 *
 * P5: The bot will reply "No way, Venn can suck my blu cane" if:
 *   1. Someone uses the phrase "bluebot say something nice about venn" (text or @username)
 */

export default function createBlueBot(config: BluBotConfig = {}): ReplyBot {
	const webhookServiceToUse = config.webhookService || webhookService;
	const niceRequestCondition = new BluNiceRequestCondition();
	const niceResponseGenerator = new BluNiceResponseGenerator(niceRequestCondition);

	const bot = new BotBuilder('BlueBot', webhookServiceToUse)
		.withAvatar(DEFAULT_AVATAR)
		.withCustomCondition(
			"Did somebody say Blu",
			DEFAULT_AVATAR,
			new OneCondition(
				new PatternCondition(Patterns.WORD_BLUE),
				new BlueAICondition(OpenAIClient)
			)
		)
		.withCustomCondition(
			"Somebody definitely said blu",
			CHEEKY_AVATAR,
			new AllConditions(
				new OneCondition(
					new PatternCondition(Patterns.WORD_BLUE),
					new PatternCondition(Patterns.BLUEBOT_MEAN_WORDS),
					new PatternCondition(Patterns.BLUEBOT_ACKNOWLEDGMENT)
				),
				new RecentMessageCondition(5)
			)
		)
		.withCustomCondition(
			"What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Academia d'Azul, and I've been involved in numerous secret raids on Western La Noscea, and I have over 300 confirmed kills. I've trained with gorillas in warfare and I'm the top bombardier in the entire Eorzean Alliance. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Shard, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of tonberries across Eorzea and your IP is being traced right now so you better prepare for the storm, macaroni boy. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bear-hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the Eorzean Blue Brigade and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little \"clever\" comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will fucking cook you like the little macaroni boy you are. You're fucking dead, kiddo.",
			DEFAULT_AVATAR,
			new AllConditions(
				new PatternCondition(Patterns.WORD_BLUE),
				new PatternCondition(Patterns.BLUEBOT_MEAN_WORDS),
				new UserMessageCondition(UserID.Venn),
				new RecentMessageCondition(5),
				new CooldownCondition(24 * 60)
			)
		)
		.withConditionResponse(
			niceResponseGenerator,
			DEFAULT_AVATAR,
			new OneCondition(
				niceRequestCondition,
				new PatternCondition(Patterns.BLUEBOT_NICE_REQUEST_NAMED)
			)
		)
		.withCustomCondition(
			"No way, Venn can suck my blu cane",
			MURDER_AVATAR,
			new PatternCondition(Patterns.BLUEBOT_MEAN_ABOUT_VENN)
		)
		.build();

	return bot;
}
