import e2eStatusBot from '../../src/reply-bots/e2e-status-bot';
import { mockMessage } from '../../src/test-utils/test-utils';
import { E2E_LOADED_PREFIX, E2E_IDENT_PREFIX } from '../../src/reply-bots/e2e-status-bot/constants';

// Mock shared to control debug/whitelist and DiscordService
jest.mock('@starbunk/shared', () => {
	const actual = jest.requireActual('@starbunk/shared');
	const sendMessage = jest.fn().mockResolvedValue(undefined);
	const getMemberAsync = jest.fn().mockResolvedValue({});
	return {
		...actual,
		getMessageFilter: () => ({
			isDebugMode: () => true,
			getTestingChannelIds: () => ['test-channel-id'],
		}),
		getDiscordService: () => ({
			sendMessage,
			getMemberAsync,
		}),
		__mocks: { sendMessage, getMemberAsync },
	};
});

// Mock BotRegistry to control loaded bot names
jest.mock('../../src/bot-registry', () => ({
	BotRegistry: class {
		static getInstance() {
			return new this();
		}
		getReplyBotNames() {
			return ['BlueBot', 'GuyBot'];
		}
	},
}));

describe('E2EStatusBot (debug-only)', () => {
	it('should respond to "e2e: list bots" and emit diagnostics lines', async () => {
		// Arrange
		const message = mockMessage({
			content: 'e2e: list bots',
			channelId: 'test-channel-id',
			guild: { id: 'guild-1' } as any,
		});

		// Act
		const should = await e2eStatusBot.shouldRespond(message as any);
		expect(should).toBe(true);
		await e2eStatusBot.processMessage(message as any);

		// Assert
		const shared = require('@starbunk/shared');
		const sendMessage = shared.__mocks.sendMessage as jest.Mock;
		expect(sendMessage).toHaveBeenCalledTimes(2);
		const first = (sendMessage.mock.calls[0] || [])[1] as string;
		const second = (sendMessage.mock.calls[1] || [])[1] as string;
		expect(first.startsWith(E2E_LOADED_PREFIX)).toBe(true);
		expect(second.startsWith(E2E_IDENT_PREFIX)).toBe(true);
	});
});
