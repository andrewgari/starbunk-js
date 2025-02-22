import { createMockCommandInteraction } from '@/__tests__/mocks/discordMocks';
import { createMockDJCova } from '@/__tests__/mocks/serviceMocks';
import playCommand from '@/starbunk/commands/play';
import volumeCommand from '@/starbunk/commands/setVolume';
import stopCommand from '@/starbunk/commands/stop';
import { getStarbunkClient } from '@/starbunk/starbunkClient';
import { ChatInputCommandInteraction } from 'discord.js';

// Mock the getStarbunkClient function
jest.mock('@/starbunk/starbunkClient', () => ({
	getStarbunkClient: jest.fn()
}));

describe('Music Commands', () => {
	let mockInteraction: Partial<ChatInputCommandInteraction>;
	let mockDJCova: ReturnType<typeof createMockDJCova>;

	beforeEach(() => {
		mockDJCova = createMockDJCova();
		mockInteraction = createMockCommandInteraction() as unknown as Partial<ChatInputCommandInteraction>;

		(getStarbunkClient as jest.Mock).mockReturnValue({
			getMusicPlayer: () => mockDJCova
		});
	});

	describe('Play Command', () => {
		it('should successfully play a song when user is in voice channel', async () => {
			await playCommand.execute(mockInteraction as ChatInputCommandInteraction);

			expect(mockDJCova.start).toHaveBeenCalledWith('https://youtube.com/mock');
			expect(mockInteraction.followUp).toHaveBeenCalledWith(
				expect.stringContaining('Now playing')
			);
		});

		it('should reject if user is not in voice channel', async () => {
			const noVoiceInteraction = {
				...mockInteraction,
				member: {
					...mockInteraction.member,
					voice: { channel: null }
				}
			} as unknown as ChatInputCommandInteraction;

			await playCommand.execute(noVoiceInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith(
				expect.stringContaining('need to be in a voice channel')
			);
			expect(mockDJCova.start).not.toHaveBeenCalled();
		});

		it('should handle missing URL parameter', async () => {
			const noUrlInteraction = {
				...mockInteraction,
				options: {
					getString: jest.fn().mockReturnValue(null)
				}
			} as unknown as ChatInputCommandInteraction;

			await playCommand.execute(noUrlInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith(
				expect.stringContaining('provide a valid YouTube link')
			);
			expect(mockDJCova.start).not.toHaveBeenCalled();
		});
	});

	describe('Stop Command', () => {
		it('should stop playback and disconnect', async () => {
			await stopCommand.execute(mockInteraction as ChatInputCommandInteraction);

			expect(mockDJCova.stop).toHaveBeenCalled();
		});
	});

	describe('Volume Command', () => {
		it('should adjust volume when given valid input', async () => {
			const validVolInteraction = {
				...mockInteraction,
				options: {
					get: jest.fn().mockReturnValue({ value: 50 })
				}
			} as unknown as ChatInputCommandInteraction;

			await volumeCommand.execute(validVolInteraction);

			expect(mockDJCova.changeVolume).toHaveBeenCalledWith(5); // 50/10
		});

		it('should not adjust volume when input is out of range', async () => {
			const invalidVolInteraction = {
				...mockInteraction,
				options: {
					get: jest.fn().mockReturnValue({ value: 101 })
				}
			} as unknown as ChatInputCommandInteraction;

			await volumeCommand.execute(invalidVolInteraction);

			expect(mockDJCova.changeVolume).not.toHaveBeenCalled();
		});
	});
});
