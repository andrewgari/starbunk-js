import { mockMessage } from '../../src/test-utils/testUtils';
import clankerBot from '../../src/reply-bots/clanker-bot';
import { clankerTrigger } from '../../src/reply-bots/clanker-bot/triggers';
import {
	CLANKER_BOT_RESPONSES,
	CLANKER_BOT_NAME,
	CLANKER_BOT_AVATARS,
} from '../../src/reply-bots/clanker-bot/constants';

// Deterministic random
const originalRandom = global.Math.random;
let mockRandomValue = 0.5;

beforeEach(() => {
	jest.clearAllMocks();
	global.Math.random = jest.fn().mockImplementation(() => mockRandomValue);
});

afterAll(() => {
	global.Math.random = originalRandom;
});

describe('ClankerBot', () => {
	describe('Trigger condition', () => {
		it('responds to whole word clanker, case-insensitive', async () => {
			const msgs = [
				mockMessage({ content: 'clanker' }),
				mockMessage({ content: 'a CLANKER thing' }),
				mockMessage({ content: 'I said ClAnKeR.' }),
			];
			for (const msg of msgs) {
				const should = await clankerTrigger.condition(msg);
				expect(should).toBe(true);
			}
		});

		it('does not respond to non-word substrings', async () => {
			const msgs = [
				mockMessage({ content: 'declankering' }),
				mockMessage({ content: 'clankers' }),
				mockMessage({ content: 'space-clankerish' }),
			];
			for (const msg of msgs) {
				const should = await clankerTrigger.condition(msg);
				expect(should).toBe(false);
			}
		});
	});

	describe('Response generation', () => {
		it('picks a response from constants array', async () => {
			const msg = mockMessage({ content: 'clanker' });
			const resp = await clankerTrigger.response(msg);
			expect(CLANKER_BOT_RESPONSES).toContain(resp);
		});

		it('is deterministic with mocked random', async () => {
			mockRandomValue = 0.3;
			const idx = Math.floor(mockRandomValue * CLANKER_BOT_RESPONSES.length);
			const msg = mockMessage({ content: 'clanker' });
			const resp = await clankerTrigger.response(msg);
			expect(resp).toBe(CLANKER_BOT_RESPONSES[idx]);
		});
	});

	describe('Identity constants', () => {
		it('has correct bot name and avatar URL', () => {
			expect(clankerBot.name).toBe(CLANKER_BOT_NAME);
			expect(CLANKER_BOT_NAME).toBe('ClankerBot');
			expect(CLANKER_BOT_AVATARS.HK47).toContain('http');
		});
	});
});
