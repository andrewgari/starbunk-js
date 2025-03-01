import userID from "@/discord/userID";
import { OpenAIClient } from "@/openai/openaiClient";
import webhookService, { WebhookService } from "@/webhooks/webhookService";
import OpenAI from "openai";
import { BotBuilder } from "../../botBuilder";
import { TriggerCondition } from "../../botTypes";
import ReplyBot from "../../replyBot";
import { AllConditions } from "../../triggers/conditions/allConditions";
import { BlueAICondition } from "../../triggers/conditions/blueAICondition";
import { CooldownCondition } from "../../triggers/conditions/cooldownCondition";
import { NotCondition } from "../../triggers/conditions/notCondition";
import { OneCondition } from "../../triggers/conditions/oneCondition";
import { PatternCondition } from "../../triggers/conditions/patternCondition";
import { Patterns } from "../../triggers/conditions/patterns";
import { UserMessageCondition } from "../../triggers/conditions/userMessageCondition";
import { AVATAR_URLS, DEFAULT_RESPONSES, STATE_KEYS } from "./blueBotModel";

// Import extracted components
import { BluNiceRequestCondition } from "./conditions/bluNiceRequestCondition";
import { RecentBluMessageCondition } from "./conditions/recentBluMessageCondition";
import { updateBlueBotIdentity } from "./identity/blueBotIdentityUpdater";
import { BluNiceResponseGenerator } from "./responses/bluNiceResponseGenerator";
import { CheekyBluResponseGenerator } from "./responses/cheekyBluResponseGenerator";
import { InitialBluResponseGenerator } from "./responses/initialBluResponseGenerator";
import { NavySealResponseGenerator } from "./responses/navySealResponseGenerator";

// Export state persistence keys for tests
export const BLUEBOT_TIMESTAMP_KEY = STATE_KEYS.TIMESTAMP;
export const BLUEBOT_LAST_AVATAR_KEY = STATE_KEYS.LAST_AVATAR;

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
				new UserMessageCondition(userID.Venn),
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
