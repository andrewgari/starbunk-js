import { Message } from 'discord.js';
import { OpenAI } from 'openai';
import { Logger } from '../../../services/logger';
import webhookService, { WebhookService } from '../../../webhooks/webhookService';
import { BotBuilder } from '../botBuilder';
import { BlueAcknowledgmentCondition, PatternCondition, Patterns, TimeDelayCondition, VennCondition } from '../conditions';
import { createBluBotIdentityUpdater } from '../identity/dynamicIdentity';
import ReplyBot from '../replyBot';
import { NiceMessageResponse } from '../responses/bluBotResponses';
import { AllConditionsTrigger, BlueAICondition, CompositeTrigger } from '../triggers/bluBotTriggers';
import { BlueBotNiceMessageTrigger as NiceMessageTrigger } from '../triggers/patternTriggers';

// Avatar URLs
const DEFAULT_AVATAR = 'https://imgur.com/WcBRCWn.png';
const CHEEKY_AVATAR = 'https://i.imgur.com/dO4a59n.png';
const MURDER_AVATAR = 'https://imgur.com/Tpo8Ywd.jpg';

// Time constants
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Response messages
const RESPONSES = {
	BASIC_MENTION: "Did somebody say Blu?",
	ACKNOWLEDGMENT: "Lol, Somebody definitely said Blu! :smile:",
	NAVY_SEAL: "What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Academia d'Azul, and I've been involved in numerous secret raids on Western La Noscea, and I have over 300 confirmed kills. I've trained with gorillas in warfare and I'm the top bombardier in the entire Eorzean Alliance. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on this Shard, mark my fucking words. You think you can get away with saying that shit to me over the Internet? Think again, fucker. As we speak I am contacting my secret network of tonberries across Eorzea and your IP is being traced right now so you better prepare for the storm, macaroni boy. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bear-hands. Not only am I extensively trained in unarmed combat, but I have access to the entire arsenal of the Eorzean Blue Brigade and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little \"clever\" comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will fucking cook you like the little macaroni boy you are. You're fucking dead, kiddo.",
	VENN_INSULT: "No way, Venn can suck my blu cane. :unamused:"
};

/**
 * Configuration options for BluBot
 */
export interface BluBotConfig {
	webhookService?: WebhookService;
	openAIClient?: OpenAI;
	useAIDetection?: boolean;
}

/**
 * Creates an OpenAI client if an API key is available in the environment
 */
function createOpenAIClient(): OpenAI | undefined {
	const apiKey = process.env.OPENAI_KEY;
	if (!apiKey) {
		Logger.warn('No OpenAI API key found in environment. AI detection will be disabled.');
		return undefined;
	}

	try {
		return new OpenAI({ apiKey });
	} catch (error) {
		Logger.error('Failed to create OpenAI client:', error as Error);
		return undefined;
	}
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
 * P4: The Bot will reply "<NAME>, I think you're really blu" if:
 *   1. Someone uses the phrase "bluebot, say something nice about <NAME>"
 *   2. A higher priority pattern doesn't match
 *
 * P5: The bot will reply "No way, Venn can suck my blu cane" if:
 *   1. Someone uses the phrase "bluebot say something nice about venn" (text or @username)
 */
export default function createBlueBot(config: BluBotConfig = {}): ReplyBot {
	const webhookServiceParam = config.webhookService || webhookService;
	const openAIClient = config.openAIClient || createOpenAIClient();
	const useAIDetection = config.useAIDetection !== undefined ? config.useAIDetection : !!openAIClient;

	if (useAIDetection && !openAIClient) {
		Logger.warn('AI detection enabled but no OpenAI client provided. Falling back to regex detection.');
	}

	if (openAIClient) {
		Logger.info('BluBot initialized with AI detection capability.');
	}

	// Create the identity updater that changes avatar based on message content
	const identityUpdater = createBluBotIdentityUpdater(
		DEFAULT_AVATAR,  // Default avatar
		CHEEKY_AVATAR,   // Used for interactions/acknowledgments
		MURDER_AVATAR    // Used for Venn insults
	);

	// Create time delay conditions that will be shared across rules
	const withinFiveMinutes = new TimeDelayCondition(FIVE_MINUTES_MS, true);
	const cooldownOneDay = new TimeDelayCondition(ONE_DAY_MS, false);

	// Create the bot builder
	const builder = new BotBuilder('BluBot', webhookServiceParam)
		.withAvatar(DEFAULT_AVATAR)
		.withDynamicIdentity(DEFAULT_AVATAR, identityUpdater);

	// Create detection conditions based on available capabilities
	let blueDetectionCondition;
	if (openAIClient && useAIDetection) {
		// Create a composite trigger for OR logic
		blueDetectionCondition = new CompositeTrigger([
			new PatternCondition(Patterns.BLUE),
			new BlueAICondition(openAIClient),
		]);
	} else {
		blueDetectionCondition = new PatternCondition(Patterns.BLUE);
	}

	// Add conditions in order of increasing precedence (lower items take precedence)

	// P1: Basic "blu" mention - "Did somebody say Blu?"
	builder.withCustomCondition(
		RESPONSES.BASIC_MENTION,
		blueDetectionCondition
	);

	// P2: Interaction/acknowledgment - "Somebody definitely said Blu!"
	// Create acknowledgment condition
	const acknowledgmentCondition = new BlueAcknowledgmentCondition();

	// Create composite trigger for blue detection OR acknowledgment
	const blueOrAcknowledgmentCondition = new CompositeTrigger([
		blueDetectionCondition,
		acknowledgmentCondition
	]);

	// Combine with time window check
	const timeConstrainedBlueCondition = new AllConditionsTrigger([
		blueOrAcknowledgmentCondition,
		withinFiveMinutes
	]);

	builder.withCustomCondition(
		RESPONSES.ACKNOWLEDGMENT,
		timeConstrainedBlueCondition
	);

	// P3: Navy Seal copypasta for Venn
	// Using MeanPatternCondition AND withinFiveMinutes AND VennCondition AND cooldownOneDay
	const vennNavySealCondition = new AllConditionsTrigger([
		new PatternCondition(Patterns.MEAN),
		withinFiveMinutes,
		new VennCondition(),
		cooldownOneDay
	]);

	builder.withCustomCondition(
		RESPONSES.NAVY_SEAL,
		vennNavySealCondition
	);

	// P4: Nice message request - "<NAME>, I think you're pretty Blu!"
	// This is handled by the NiceMessageResponse class which extracts the name
	const niceResponse = new NiceMessageResponse(new NiceMessageTrigger());
	builder.withConditionResponse(
		niceResponse,
		new PatternCondition(Patterns.BLUE_REQUEST)
	);

	// P5: Bluebot, say something nice about Venn
	// Create a custom condition that checks if it's a request about Venn
	const isVennRequestCondition = {
		shouldTrigger: async (message: Message): Promise<boolean> => {
			const pattern = /blue?bot,? say something nice about venn/i;
			return pattern.test(message.content);
		}
	};

	builder.withCustomCondition(
		RESPONSES.VENN_INSULT,
		isVennRequestCondition
	);

	// Build and return the bot
	return builder.build();
}
