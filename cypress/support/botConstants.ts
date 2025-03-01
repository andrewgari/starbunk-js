/**
 * Bot Constants for Cypress Tests
 *
 * This file imports and exports constants from all bot model files
 * to make them available for use in Cypress tests.
 *
 * Using these constants ensures consistency between unit tests and E2E tests.
 */

// Import constants from bot model files with renamed imports to avoid conflicts
import { BOT_NAME as ATTITUDEBOT_NAME, TEST as ATTITUDEBOT_TEST, NEGATIVE_ATTITUDE_RESPONSE } from '../../src/starbunk/bots/reply-bots/attitudeBot/attitudeBotModel';
import { BOT_NAME as BABYBOT_NAME, TEST as BABYBOT_TEST, BABY_RESPONSE } from '../../src/starbunk/bots/reply-bots/babyBot/babyBotModel';
import { BANANA_RESPONSES } from '../../src/starbunk/bots/reply-bots/bananaBot/bananaBotModel';
import { BLUEBOT_NAME, DEFAULT_RESPONSES } from '../../src/starbunk/bots/reply-bots/blueBot/blueBotModel';
import { BOT_NAME as BOTBOT_NAME, TEST as BOTBOT_TEST, BOT_GREETING } from '../../src/starbunk/bots/reply-bots/botBot/botBotModel';
import { BOT_NAME as CHAOSBOT_NAME, TEST as CHAOSBOT_TEST, CHAOS_RESPONSE } from '../../src/starbunk/bots/reply-bots/chaosBot/chaosBotModel';
import { TEST as CHECKBOT_TEST, CHECK_RESPONSE, CZECH_RESPONSE } from '../../src/starbunk/bots/reply-bots/checkBot/checkBotModel';
import { EZIO_BOT_NAME as EZIOBOT_NAME, TEST as EZIOBOT_TEST, EZIO_BOT_RESPONSE } from '../../src/starbunk/bots/reply-bots/ezioBot/ezioBotModel';
import { BOT_NAME as GUNDAMBOT_NAME, TEST as GUNDAMBOT_TEST, GUNDAM_RESPONSE } from '../../src/starbunk/bots/reply-bots/gundamBot/gundamBotModel';
import { BOT_NAME as GUYBOT_NAME, TEST as GUYBOT_TEST, RESPONSES } from '../../src/starbunk/bots/reply-bots/guyBot/guyBotModel';
import { BOT_NAME as HOLDBOT_NAME, HOLD_BOT_RESPONSE as HOLDBOT_RESPONSE, TEST as HOLDBOT_TEST } from '../../src/starbunk/bots/reply-bots/holdBot/holdBotModel';
import { BOT_NAME as MACARONIBOT_NAME, TEST as MACARONIBOT_TEST, VENN_CORRECTION } from '../../src/starbunk/bots/reply-bots/macaroniBot/macaroniBotModel';
import { TEST as MUSICCORRECTBOT_TEST, MUSIC_CORRECT_BOT_RESPONSE as MUSIC_CORRECT_RESPONSE } from '../../src/starbunk/bots/reply-bots/musicCorrectBot/musicCorrectBotModel';
import { BOT_NAME as NICEBOT_NAME, TEST as NICEBOT_TEST, NICE_BOT_RESPONSE as NICE_RESPONSE } from '../../src/starbunk/bots/reply-bots/niceBot/niceBotModel';
import { BOT_NAME as PICKLEBOT_NAME, TEST as PICKLEBOT_TEST, PICKLE_BOT_RESPONSE as PICKLE_RESPONSE } from '../../src/starbunk/bots/reply-bots/pickleBot/pickleBotModel';
import { BOT_NAME as SHEESHBOT_NAME, TEST as SHEESHBOT_TEST } from '../../src/starbunk/bots/reply-bots/sheeshBot/sheeshBotModel';
import { DEFAULT_RESPONSE, BOT_NAME as SIGGREATBOT_NAME, TEST as SIGGREATBOT_TEST } from '../../src/starbunk/bots/reply-bots/sigGreatBot/sigGreatBotModel';
import { BOT_NAME as SPIDERBOT_NAME, TEST as SPIDERBOT_TEST, SPIDERMAN_CORRECTION } from '../../src/starbunk/bots/reply-bots/spiderBot/spiderBotModel';
import { CRINGE_RESPONSES, BOT_NAME as VENNBOT_NAME, TEST as VENNBOT_TEST } from '../../src/starbunk/bots/reply-bots/vennBot/vennBotModel';

// Create empty TEST objects for bots that don't have TEST exports
const EMPTY_TEST = {
	USER_NAME: 'TestUser',
	MESSAGE: {
		UNRELATED: 'Hello there!'
	}
};

// Export all constants for use in tests
export const BOT_CONSTANTS = {
	ATTITUDEBOT: {
		NAME: ATTITUDEBOT_NAME,
		RESPONSE: NEGATIVE_ATTITUDE_RESPONSE,
		TEST: ATTITUDEBOT_TEST
	},
	BABYBOT: {
		NAME: BABYBOT_NAME,
		RESPONSE: BABY_RESPONSE,
		TEST: BABYBOT_TEST
	},
	BLUEBOT_BOT: {
		NAME: BLUEBOT_NAME,
		RESPONSE: DEFAULT_RESPONSES,
		TEST: EMPTY_TEST
	},
	CHECKBOT_BOT: {
		NAME: 'CheckBot',
		RESPONSE: CHECK_RESPONSE,
		CZECH_RESPONSE: CZECH_RESPONSE,
		TEST: CHECKBOT_TEST
	},
	EZIOBOT_BOT: {
		NAME: EZIOBOT_NAME,
		RESPONSE: EZIO_BOT_RESPONSE,
		TEST: EZIOBOT_TEST
	},
	PICKLEBOT_BOT: {
		NAME: PICKLEBOT_NAME,
		RESPONSE: PICKLE_RESPONSE,
		TEST: PICKLEBOT_TEST
	},
	BOTBOT_BOT: {
		NAME: BOTBOT_NAME,
		RESPONSE: BOT_GREETING,
		TEST: BOTBOT_TEST
	},
	CHAOSBOT_BOT: {
		NAME: CHAOSBOT_NAME,
		RESPONSE: CHAOS_RESPONSE,
		TEST: CHAOSBOT_TEST
	},
	NICEBOT_BOT: {
		NAME: NICEBOT_NAME,
		RESPONSE: NICE_RESPONSE,
		TEST: NICEBOT_TEST
	},
	BANANABOT_BOT: {
		NAME: 'BananaBot',
		RESPONSE: BANANA_RESPONSES,
		TEST: EMPTY_TEST
	},
	MACARONIBOT_BOT: {
		NAME: MACARONIBOT_NAME,
		RESPONSE: VENN_CORRECTION,
		TEST: MACARONIBOT_TEST
	},
	SHEESHBOT_BOT: {
		NAME: SHEESHBOT_NAME,
		TEST: SHEESHBOT_TEST
	},
	SPIDERBOT_BOT: {
		NAME: SPIDERBOT_NAME,
		RESPONSE: SPIDERMAN_CORRECTION,
		TEST: SPIDERBOT_TEST
	},
	GUNDAMBOT_BOT: {
		NAME: GUNDAMBOT_NAME,
		RESPONSE: GUNDAM_RESPONSE,
		TEST: GUNDAMBOT_TEST
	},
	VENNBOT_BOT: {
		NAME: VENNBOT_NAME,
		RESPONSE: CRINGE_RESPONSES,
		TEST: VENNBOT_TEST
	},
	HOLDBOT_BOT: {
		NAME: HOLDBOT_NAME,
		RESPONSE: HOLDBOT_RESPONSE,
		TEST: HOLDBOT_TEST
	},
	GUYBOT_BOT: {
		NAME: GUYBOT_NAME,
		RESPONSE: RESPONSES,
		TEST: GUYBOT_TEST
	},
	MUSICCORRECTBOT_BOT: {
		NAME: 'MusicCorrectBot',
		RESPONSE: MUSIC_CORRECT_RESPONSE,
		TEST: MUSICCORRECTBOT_TEST
	},
	SIGGREATBOT_BOT: {
		NAME: SIGGREATBOT_NAME,
		RESPONSE: DEFAULT_RESPONSE,
		TEST: SIGGREATBOT_TEST
	},
};

export default BOT_CONSTANTS;
