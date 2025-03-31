import { Message } from 'discord.js';
import userId from '../../../../discord/userId';
import { isDebugMode } from '../../../../environment';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { and, fromUser, matchesPattern, not, withinTimeframeOf } from '../../core/conditions';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { randomResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { BLUE_BOT_AVATARS, BLUE_BOT_NAME, BLUE_BOT_PATTERNS, BLUE_BOT_RESPONSES } from './constants';

// State to track when blue was mentioned or murder was triggered
let blueTimestamp = new Date(Number.MIN_SAFE_INTEGER);
let blueMurderTimestamp = new Date(Number.MIN_SAFE_INTEGER);

// Helper function to get the current blue timestamp that returns timestamp in milliseconds
const getBlueTimestamp = () => blueTimestamp.getTime();
const getBlueMurderTimestamp = () => blueMurderTimestamp.getTime();

// 1. blue-request - highest priority
export const blueRequestTrigger = createTriggerResponse({
	name: 'blue-request',
	priority: 1,
	condition: matchesPattern(BLUE_BOT_PATTERNS.Nice),
	response: (message: Message) => {
		const name = message.content.match(BLUE_BOT_PATTERNS.Nice)?.groups?.n ?? '';

		if (name.toLowerCase() === 'venn') {
			return 'No way, Venn can suck my blu cane. :unamused:';
		}

		return `${name}, I think you're pretty blu :wink:`;
	},
	identity: {
		botName: BLUE_BOT_NAME,
		avatarUrl: BLUE_BOT_AVATARS.Default
	}
});

// 2. blue-acknowledge - respond to acknowledgment within 2 minutes
export const blueAcknowledgeTrigger = createTriggerResponse({
	name: 'blue-acknowledge',
	priority: 2,
	condition: and(
		matchesPattern(BLUE_BOT_PATTERNS.Confirm),
		withinTimeframeOf(getBlueTimestamp, 2, 'm')
	),
	response: randomResponse(BLUE_BOT_RESPONSES.Cheeky),
	identity: (message: Message) => ({
		botName: BLUE_BOT_NAME,
		avatarUrl: fromUser(isDebugMode() ? userId.Cova : userId.Venn)(message)
			? BLUE_BOT_AVATARS.Murder
			: BLUE_BOT_AVATARS.Cheeky
	})
});

// 3. blue-standard - respond to any blue mention
export const blueStandardTrigger = createTriggerResponse({
	name: 'blue-standard',
	priority: 3,
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

// Blue response trigger - responds when someone confirms blue
export const blueConfirmTrigger = createTriggerResponse({
	name: 'blue-confirm',
	priority: 4,
	condition: and(
		matchesPattern(BLUE_BOT_PATTERNS.Confirm),
		withinTimeframeOf(getBlueTimestamp, 2, 'm')
	),
	response: randomResponse(BLUE_BOT_RESPONSES.Cheeky),
	identity: {
		botName: 'BluBot',
		avatarUrl: BLUE_BOT_AVATARS.Cheeky
	}
});

// Venn insult trigger
export const blueMurderTrigger = createTriggerResponse({
	name: 'blue-murder',
	priority: 5,
	condition: and(
		// From Venn (or Cova in debug mode)
		fromUser(isDebugMode() ? userId.Cova : userId.Venn),
		// Contains mean words
		matchesPattern(BLUE_BOT_PATTERNS.Mean),
		// Within timeframe of blue mention
		withinTimeframeOf(getBlueTimestamp, 2, 'm'),
		// Murder cooldown is over (1 day)
		not(withinTimeframeOf(getBlueMurderTimestamp, 24, 'h'))
	),
	response: (_message: Message) => {
		// Side effect to update murder timestamp
		blueMurderTimestamp = new Date();
		return BLUE_BOT_RESPONSES.Murder;
	},
	identity: {
		botName: 'BluBot',
		avatarUrl: BLUE_BOT_AVATARS.Murder
	}
});

// Nice request trigger
export const blueNiceTrigger = createTriggerResponse({
	name: 'blue-nice',
	priority: 6,
	condition: matchesPattern(BLUE_BOT_PATTERNS.Nice),
	response: (message: Message) => {
		let name = message.content.match(BLUE_BOT_PATTERNS.Nice)?.groups?.n ?? "Hey";

		if (name.toLowerCase() === 'venn') {
			return `No way, Venn can suck my blu cane. :unamused:`;
		}

		if (name.toLowerCase() === 'me') {
			name = 'Hey';
		}

		return `${name}, I think you're pretty Blu! :wink: :blue_heart:`;
	}
});

export const blueQuestionTrigger = createTriggerResponse({
	name: 'blue-question',
	priority: 7,
	condition: matchesPattern(BLUE_BOT_PATTERNS.Question),
	response: (_message: Message) => {
		return `I'm sorry, I can't answer that question. :thinking:`;
	}
});

// 4. deceptive-blue - check for sneaky blue references (lowest priority)
export const blueDeceptiveTrigger = createTriggerResponse({
	name: 'blue-deceptive',
	priority: 999, // Lowest priority
	condition: (_message: Message) => {
		// We'll use the LLM to check for deceptive blue references
		// This is a placeholder condition that always returns true
		// The actual filtering happens in the response
		return true;
	},
	response: async (_message: Message) => {
		// This is where we'd integrate with an LLM using the BLUE_BOT_PROMPTS.DeceptiveCheck
		// For now, we'll return an empty string to indicate no deceptive reference found
		// When implementing the LLM integration, we'll return the actual response or empty string
		return '';
	},
	identity: {
		botName: BLUE_BOT_NAME,
		avatarUrl: BLUE_BOT_AVATARS.Cheeky
	}
});
