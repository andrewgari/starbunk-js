import { mockMessage } from '../../src/test-utils/test-utils';
import clankerBot from '../../src/reply-bots/clanker-bot';
import { clankerTrigger } from '../../src/reply-bots/clanker-bot/triggers';
import {
	CLANKER_BOT_NAME,
	CLANKER_BOT_AVATARS,
	CLANKER_BOT_RESPONSES,
} from '../../src/reply-bots/clanker-bot/constants';

beforeEach(() => {
	jest.clearAllMocks();
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
		it('replies with one of the configured responses when regex matches', async () => {
			const msg = mockMessage({ content: 'clanker' });
			const resp = await clankerTrigger.response(msg);
			expect(CLANKER_BOT_RESPONSES).toContain(resp);
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
