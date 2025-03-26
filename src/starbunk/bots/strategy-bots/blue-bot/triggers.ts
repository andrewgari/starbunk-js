import { Message } from 'discord.js';
import userId from '../../../../discord/userId';
import { isDebugMode } from '../../../../environment';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TimeUnit as _TimeUnit } from '../../../../utils/time';
import { and, fromUser, matchesPattern, not, withinTimeframeOf } from '../../core/conditions';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { randomResponse, regexCaptureResponse as _regexCaptureResponse, staticResponse } from '../../core/responses';
import { createTriggerResponse } from '../../core/trigger-response';
import { BLUE_BOT_AVATARS, BLUE_BOT_PATTERNS, BLUE_BOT_RESPONSES } from './constants';

// State to track when blue was mentioned or murder was triggered
let blueTimestamp = new Date(Number.MIN_SAFE_INTEGER);
let blueMurderTimestamp = new Date(Number.MIN_SAFE_INTEGER);

// Helper function to get the current blue timestamp that returns timestamp in milliseconds
const getBlueTimestamp = () => blueTimestamp.getTime();
const getBlueMurderTimestamp = () => blueMurderTimestamp.getTime();

// Regular Blu mention trigger
export const blueMentionTrigger = createTriggerResponse({
	name: 'blue-mention',
	priority: 1,
	condition: matchesPattern(BLUE_BOT_PATTERNS.Default),
	response: staticResponse(BLUE_BOT_RESPONSES.Default),
	// Side effect to update the timestamp when this triggers
	identity: (_message: Message) => {
		blueTimestamp = new Date();
		return {
			botName: 'BluBot',
			avatarUrl: BLUE_BOT_AVATARS.Default
		};
	}
});

// Blue response trigger - responds when someone confirms blue
export const blueConfirmTrigger = createTriggerResponse({
	name: 'blue-confirm',
	priority: 2,
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
	priority: 3,
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
	priority: 4,
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
	priority: 5,
	condition: matchesPattern(BLUE_BOT_PATTERNS.Question),
	response: (_message: Message) => {
		return `I'm sorry, I can't answer that question. :thinking:`;
	}
});
