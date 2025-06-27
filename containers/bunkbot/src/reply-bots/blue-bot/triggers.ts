import { Message } from 'discord.js';
import { isDebugMode } from '@starbunk/shared';

// Simple user IDs for testing and development
const userId = {
	Cova: '139592376443338752', // Cova's actual Discord user ID
	Venn: '123456789012345678' // Valid format placeholder for Venn
};
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { and, fromUser, llmDetects, matchesPattern, not, or, withinTimeframeOf } from '../../core/conditions';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { randomResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { BLUE_BOT_AVATARS, BLUE_BOT_NAME, BLUE_BOT_PATTERNS, BLUE_BOT_PROMPTS, BLUE_BOT_RESPONSES } from './constants';

// State to track when blue was mentioned or murder was triggered
let blueTimestamp = new Date(Number.MIN_SAFE_INTEGER);
let blueMurderTimestamp = new Date(Number.MIN_SAFE_INTEGER);

// Helper function to get the current blue timestamp that returns timestamp in milliseconds
const getBlueTimestamp = () => blueTimestamp.getTime();
const getBlueMurderTimestamp = () => blueMurderTimestamp.getTime();

export const triggerBlueBotNiceVenn = createTriggerResponse({
	name: 'blue-nice-venn',
	priority: 1,
	condition: and(
		matchesPattern(BLUE_BOT_PATTERNS.Nice),
		fromUser(userId.Venn)
	),
	response: () => 'No way, Venn can suck my blu cane. :unamused:',
	identity: {
		botName: BLUE_BOT_NAME,
		avatarUrl: BLUE_BOT_AVATARS.Contempt
	}
});

// bluebot, say something nice about <name>
export const triggerBlueBotNice = createTriggerResponse({
	name: 'blue-nice',
	priority: 2,
	condition: matchesPattern(BLUE_BOT_PATTERNS.Nice),
	response: (message: Message) => {
		const name = message.content.match(BLUE_BOT_PATTERNS.Nice)?.groups?.n ?? '';
		return `${name}, I think you're pretty blu :wink:`;
	},
	identity: {
		botName: BLUE_BOT_NAME,
		avatarUrl: BLUE_BOT_AVATARS.Cheeky
	}
});

// 2. blue-acknowledge - respond to acknowledgment within 2 minutes
export const triggerBlueBotAcknowledgeVennMean = createTriggerResponse({
	name: 'blue-venn-mean',
	priority: 3,
	condition: and(
		or(matchesPattern(BLUE_BOT_PATTERNS.Confirm), matchesPattern(BLUE_BOT_PATTERNS.Mean)),
		fromUser(isDebugMode() ? userId.Cova : userId.Venn),
		withinTimeframeOf(getBlueTimestamp, 2, 'm')
	),
	response: (message) => {
		const isMurderMode = withinTimeframeOf(getBlueMurderTimestamp, 1, 'm')(message);
		if (isMurderMode) {
			blueMurderTimestamp = new Date();
			return BLUE_BOT_RESPONSES.Murder;
		}
		return "Oh, somebody definitely said blue...";
	},
	identity: (message: Message) => ({
		botName: BLUE_BOT_NAME,
		avatarUrl: withinTimeframeOf(getBlueMurderTimestamp, 1, 'm')(message)
			? BLUE_BOT_AVATARS.Murder
			: BLUE_BOT_AVATARS.Default
	})
});

export const triggerBlueBotAcknowledgeOther = createTriggerResponse({
	name: 'blue-acknowledge',
	priority: 4,
	condition: and(
		not(fromUser(userId.Venn)),
		or(matchesPattern(BLUE_BOT_PATTERNS.Confirm), matchesPattern(BLUE_BOT_PATTERNS.Mean), matchesPattern(BLUE_BOT_PATTERNS.Default)),
		withinTimeframeOf(getBlueTimestamp, 2, 'm')
	),
	response: () => {
		blueMurderTimestamp = new Date();
		return randomResponse(BLUE_BOT_RESPONSES.Cheeky);
	},
	identity: (message: Message) => ({
		botName: BLUE_BOT_NAME,
		avatarUrl: fromUser(isDebugMode() ? userId.Cova : userId.Venn)(message)
			? BLUE_BOT_AVATARS.Murder
			: BLUE_BOT_AVATARS.Default
	})
});

// 3. blue-standard - respond to any blue mention
export const triggerBlueBotMention = createTriggerResponse({
	name: 'blue-standard',
	priority: 5,
	condition: matchesPattern(BLUE_BOT_PATTERNS.Default),
	response: (_message: Message) => {
		blueTimestamp = new Date(); // Update timestamp when blue is mentioned
		return BLUE_BOT_RESPONSES.Default;
	},
	identity: {
		botName: BLUE_BOT_NAME,
		avatarUrl: BLUE_BOT_AVATARS.Default
	}
});

export const triggerBlueBotLlmDetection = createTriggerResponse({
	name: 'blue-ai-generated',
	priority: 6,
	condition: and(
		(message: Message) => message.content.trim().length > 0,
		llmDetects(BLUE_BOT_PROMPTS.DeceptiveCheck)
	),
	response: () => BLUE_BOT_RESPONSES.Default,
	identity: {
		botName: BLUE_BOT_NAME,
		avatarUrl: BLUE_BOT_AVATARS.Default
	}
});
