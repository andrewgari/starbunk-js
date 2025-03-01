/**
 * Bot Constants for Cypress Tests
 *
 * This file imports and exports constants from all bot model files
 * to make them available for use in Cypress tests.
 *
 * Using these constants ensures consistency between unit tests and E2E tests.
 */

// Import constants from bot model files with renamed imports to avoid conflicts
import { BOT_NAME as ATTITUDEBOT_BOT_NAME, TEST as ATTITUDEBOT_BOT_TEST, NEGATIVE_ATTITUDE_RESPONSE } from '../../src/starbunk/bots/reply-bots/attitudeBot/attitudeBotModel';
import { BOT_NAME as BABYBOT_BOT_NAME, TEST as BABYBOT_BOT_TEST, BABY_RESPONSE } from '../../src/starbunk/bots/reply-bots/babyBot/babyBotModel';
import { BANANA_RESPONSES } from '../../src/starbunk/bots/reply-bots/bananaBot/bananaBotModel';
import { DEFAULT_RESPONSES } from '../../src/starbunk/bots/reply-bots/blueBot/blueBotModel';
import { BOT_NAME as BOTBOT_BOT_NAME, TEST as BOTBOT_BOT_TEST, BOT_GREETING } from '../../src/starbunk/bots/reply-bots/botBot/botBotModel';
import { BOT_NAME as CHAOSBOT_BOT_NAME, TEST as CHAOSBOT_BOT_TEST, CHAOS_RESPONSE } from '../../src/starbunk/bots/reply-bots/chaosBot/chaosBotModel';
import { TEST as CHECKBOT_BOT_TEST, CHECK_RESPONSE, CZECH_RESPONSE } from '../../src/starbunk/bots/reply-bots/checkBot/checkBotModel';
import { EZIO_BOT_NAME as EZIOBOT_BOT_NAME, TEST as EZIOBOT_BOT_TEST, EZIO_BOT_RESPONSE } from '../../src/starbunk/bots/reply-bots/ezioBot/ezioBotModel';
import { BOT_NAME as GUNDAMBOT_BOT_NAME, TEST as GUNDAMBOT_BOT_TEST, GUNDAM_RESPONSE } from '../../src/starbunk/bots/reply-bots/gundamBot/gundamBotModel';
import { BOT_NAME as GUYBOT_BOT_NAME, TEST as GUYBOT_BOT_TEST, RESPONSES } from '../../src/starbunk/bots/reply-bots/guyBot/guyBotModel';
import { BOT_NAME as HOLDBOT_BOT_NAME, TEST as HOLDBOT_BOT_TEST, HOLD_BOT_RESPONSE } from '../../src/starbunk/bots/reply-bots/holdBot/holdBotModel';
import { BOT_NAME as MACARONIBOT_BOT_NAME, TEST as MACARONIBOT_BOT_TEST, VENN_CORRECTION } from '../../src/starbunk/bots/reply-bots/macaroniBot/macaroniBotModel';
import { TEST as MUSICCORRECTBOT_BOT_TEST, MUSIC_CORRECT_BOT_RESPONSE } from '../../src/starbunk/bots/reply-bots/musicCorrectBot/musicCorrectBotModel';
import { BOT_NAME as NICEBOT_BOT_NAME, TEST as NICEBOT_BOT_TEST, NICE_BOT_RESPONSE } from '../../src/starbunk/bots/reply-bots/niceBot/niceBotModel';
import { BOT_NAME as PICKLEBOT_BOT_NAME, TEST as PICKLEBOT_BOT_TEST, PICKLE_BOT_RESPONSE } from '../../src/starbunk/bots/reply-bots/pickleBot/pickleBotModel';
import { BOT_NAME as SHEESHBOT_BOT_NAME, TEST as SHEESHBOT_BOT_TEST } from '../../src/starbunk/bots/reply-bots/sheeshBot/sheeshBotModel';
import { DEFAULT_RESPONSE, BOT_NAME as SIGGREATBOT_BOT_NAME, TEST as SIGGREATBOT_BOT_TEST } from '../../src/starbunk/bots/reply-bots/sigGreatBot/sigGreatBotModel';
import { BOT_NAME as SPIDERBOT_BOT_NAME, TEST as SPIDERBOT_BOT_TEST, SPIDERMAN_CORRECTION } from '../../src/starbunk/bots/reply-bots/spiderBot/spiderBotModel';
import { CRINGE_RESPONSES, BOT_NAME as VENNBOT_BOT_NAME, TEST as VENNBOT_BOT_TEST } from '../../src/starbunk/bots/reply-bots/vennBot/vennBotModel';

// Create empty TEST objects for bots that don't have TEST exports
const EMPTY_TEST = {
	USER_NAME: 'TestUser',
	MESSAGE: {
		UNRELATED: 'Hello there!'
	}
};

// Export all constants for use in tests
export const BOT_CONSTANTS = {
	ATTITUDEBOT_BOT: {
		NAME: ATTITUDEBOT_BOT_NAME,
		RESPONSE: NEGATIVE_ATTITUDE_RESPONSE,
		TEST: ATTITUDEBOT_BOT_TEST
	},
	BABYBOT_BOT: {
		NAME: BABYBOT_BOT_NAME,
		RESPONSE: BABY_RESPONSE,
		TEST: BABYBOT_BOT_TEST
	},
	BLUEBOT_BOT: {
		NAME: 'BlueBotBot',
		RESPONSE: DEFAULT_RESPONSES,
		TEST: EMPTY_TEST
	},
	CHECKBOT_BOT: {
		NAME: 'CheckBot',
		RESPONSE: CHECK_RESPONSE,
		CZECH_RESPONSE: CZECH_RESPONSE,
		TEST: CHECKBOT_BOT_TEST
	},
	EZIOBOT_BOT: {
		NAME: EZIOBOT_BOT_NAME,
		RESPONSE: EZIO_BOT_RESPONSE,
		TEST: EZIOBOT_BOT_TEST
	},
	PICKLEBOT_BOT: {
		NAME: PICKLEBOT_BOT_NAME,
		RESPONSE: PICKLE_BOT_RESPONSE,
		TEST: PICKLEBOT_BOT_TEST
	},
	BOTBOT_BOT: {
		NAME: BOTBOT_BOT_NAME,
		RESPONSE: BOT_GREETING,
		TEST: BOTBOT_BOT_TEST
	},
	CHAOSBOT_BOT: {
		NAME: CHAOSBOT_BOT_NAME,
		RESPONSE: CHAOS_RESPONSE,
		TEST: CHAOSBOT_BOT_TEST
	},
	NICEBOT_BOT: {
		NAME: NICEBOT_BOT_NAME,
		RESPONSE: NICE_BOT_RESPONSE,
		TEST: NICEBOT_BOT_TEST
	},
	BANANABOT_BOT: {
		NAME: 'BananaBot',
		RESPONSE: BANANA_RESPONSES,
		TEST: EMPTY_TEST
	},
	MACARONIBOT_BOT: {
		NAME: MACARONIBOT_BOT_NAME,
		RESPONSE: VENN_CORRECTION,
		TEST: MACARONIBOT_BOT_TEST
	},
	SHEESHBOT_BOT: {
		NAME: SHEESHBOT_BOT_NAME,
		TEST: SHEESHBOT_BOT_TEST
	},
	SPIDERBOT_BOT: {
		NAME: SPIDERBOT_BOT_NAME,
		RESPONSE: SPIDERMAN_CORRECTION,
		TEST: SPIDERBOT_BOT_TEST
	},
	GUNDAMBOT_BOT: {
		NAME: GUNDAMBOT_BOT_NAME,
		RESPONSE: GUNDAM_RESPONSE,
		TEST: GUNDAMBOT_BOT_TEST
	},
	VENNBOT_BOT: {
		NAME: VENNBOT_BOT_NAME,
		RESPONSE: CRINGE_RESPONSES,
		TEST: VENNBOT_BOT_TEST
	},
	HOLDBOT_BOT: {
		NAME: HOLDBOT_BOT_NAME,
		RESPONSE: HOLD_BOT_RESPONSE,
		TEST: HOLDBOT_BOT_TEST
	},
	GUYBOT_BOT: {
		NAME: GUYBOT_BOT_NAME,
		RESPONSE: RESPONSES,
		TEST: GUYBOT_BOT_TEST
	},
	MUSICCORRECTBOT_BOT: {
		NAME: 'MusicCorrectBot',
		RESPONSE: MUSIC_CORRECT_BOT_RESPONSE,
		TEST: MUSICCORRECTBOT_BOT_TEST
	},
	SIGGREATBOT_BOT: {
		NAME: SIGGREATBOT_BOT_NAME,
		RESPONSE: DEFAULT_RESPONSE,
		TEST: SIGGREATBOT_BOT_TEST
	},
};

export default BOT_CONSTANTS;
