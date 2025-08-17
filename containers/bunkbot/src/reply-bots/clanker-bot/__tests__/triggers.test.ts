import { clankerTrigger } from '../triggers';
import { CLANKER_BOT_RESPONSES } from '../constants';

// Minimal message stub since response does not use message fields
const makeMessage = (content: string) => ({ content }) as any;

describe('clankerTrigger', () => {
	it('returns one of the CLANKER_BOT_RESPONSES', async () => {
		const message = makeMessage('you are a clanker');
		const reply = await clankerTrigger.response(message);
		expect(CLANKER_BOT_RESPONSES).toContain(reply);
	});

	it('condition matches when message contains the word "clanker"', async () => {
		const msg = makeMessage('that is a clanker');
		const matched = await clankerTrigger.condition(msg);
		expect(matched).toBe(true);
	});

	it('condition does not match when message lacks the exact word', async () => {
		const msg = makeMessage('clanking noises');
		const matched = await clankerTrigger.condition(msg);
		expect(matched).toBe(false);
	});
});
