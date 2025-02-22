import pingCommand from '@/starbunk/commands/ping';
import { createMockCommandInteraction } from '@/tests/mocks/discordMocks';
import { ChatInputCommandInteraction } from 'discord.js';

describe('Ping Command', () => {
	let mockInteraction: ChatInputCommandInteraction;

	beforeEach(() => {
		mockInteraction = createMockCommandInteraction();
	});

	it('should reply with "Pong."', async () => {
		await pingCommand.execute(mockInteraction);

		expect(mockInteraction.reply).toHaveBeenCalledWith('Pong.');
	});

	it('should have correct command data', () => {
		expect(pingCommand.data.name).toBe('ping');
		expect(pingCommand.data.description).toBe('Replies with pong');
	});
});
