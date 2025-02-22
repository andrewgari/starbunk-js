import roleIDs from '@/discord/roleIDs';
import userID from '@/discord/userID';
import raidWhenCommand, { getNextRaid } from '@/starbunk/commands/raidWhen';
import { createMockCommandInteraction } from '@/tests/mocks/discordMocks';
import { ChatInputCommandInteraction } from 'discord.js';

describe('RaidWhen Command', () => {
	let mockInteraction: ChatInputCommandInteraction;
	const mockDate = new Date('2024-02-19T12:00:00Z'); // A Monday

	beforeEach(() => {
		jest.useFakeTimers();
		jest.setSystemTime(mockDate);

		mockInteraction = {
			...createMockCommandInteraction(),
			user: {
				id: 'mock-user-id'
			}
		} as ChatInputCommandInteraction;
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('should calculate next raid time correctly from Monday', async () => {
		await raidWhenCommand.execute(mockInteraction);

		const expectedTimestamp = new Date('2024-02-20T24:00:00Z').getTime() / 1000;
		expect(mockInteraction.reply).toHaveBeenCalledWith({
			content: expect.stringContaining(`<t:${expectedTimestamp}:f>`),
			fetchReply: false,
			ephemeral: true
		});
	});

	it('should include raid team mention for Cova', async () => {
		mockInteraction.user.id = userID.Cova;

		await raidWhenCommand.execute(mockInteraction);

		expect(mockInteraction.reply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.stringContaining(`<@&${roleIDs.RaidTeam}>`),
				ephemeral: false
			})
		);
	});

	it('should not include raid team mention for other users', async () => {
		mockInteraction.user.id = 'some-other-id';

		await raidWhenCommand.execute(mockInteraction);

		expect(mockInteraction.reply).toHaveBeenCalledWith(
			expect.objectContaining({
				content: expect.not.stringContaining(`<@&${roleIDs.RaidTeam}>`),
				ephemeral: true
			})
		);
	});

	it('should have correct command data', () => {
		expect(raidWhenCommand.data.name).toBe('raidwhen');
		expect(raidWhenCommand.data.description).toBe('how long until raid');
	});

	describe('Next raid calculation', () => {
		it('should set next raid to Tuesday midnight from Monday', () => {
			const monday = new Date('2024-02-19T12:00:00Z');
			const result = getNextRaid(monday);
			expect(result.toISOString()).toBe('2024-02-21T00:00:00.000Z');
		});

		it('should set next raid to Wednesday midnight from Tuesday', () => {
			const tuesday = new Date('2024-02-20T12:00:00Z');
			const result = getNextRaid(tuesday);
			expect(result.toISOString()).toBe('2024-02-21T00:00:00.000Z');
		});

		it('should set next raid to next Tuesday from Thursday', () => {
			const thursday = new Date('2024-02-22T12:00:00Z');
			const result = getNextRaid(thursday);
			expect(result.toISOString()).toBe('2024-02-28T00:00:00.000Z');
		});
	});
});
