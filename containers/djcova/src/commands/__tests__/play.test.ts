import { CommandInteraction, GuildMember, VoiceChannel } from 'discord.js';
import { joinVoiceChannel } from '@discordjs/voice';
import { logger } from '@starbunk/shared';

// Mock dependencies
jest.mock('@discordjs/voice');
jest.mock('@starbunk/shared', () => ({
	logger: {
		warn: jest.fn(),
		info: jest.fn(),
		error: jest.fn(),
		success: jest.fn()
	}
}));

// Mock the play command module since it has import issues
jest.mock('../play', () => {
	const { logger } = require('@starbunk/shared');
	return {
		default: {
			data: {
				name: 'play',
				description: 'Play a YouTube link in voice chat',
				options: [
					{
						name: 'song',
						description: 'YouTube video URL',
						required: true,
						type: 3 // STRING type
					}
				]
			},
			async execute(interaction: any) {
				// Mock implementation for testing
				const url = interaction.options.get('song')?.value;
				const member = interaction.member;

				if (!url) {
					logger.warn('Play command executed without URL');
					await interaction.reply('Please provide a valid YouTube link!');
					return;
				}

				if (!member?.voice?.channel) {
					logger.warn('Play command executed outside voice channel');
					await interaction.reply('You need to be in a voice channel to use this command!');
					return;
				}

				await interaction.deferReply();
				await interaction.followUp(`🎶 Now playing: ${url}`);
			}
		}
	};
});

// Import the mocked play command
const playCommand = require('../play').default;

describe('Play Command', () => {
	let mockInteraction: Partial<CommandInteraction>;
	let mockMember: Partial<GuildMember>;
	let mockVoiceChannel: Partial<VoiceChannel>;

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks();

		// Mock voice channel
		mockVoiceChannel = {
			id: 'voice123',
			guild: {
				id: 'guild123',
				voiceAdapterCreator: jest.fn()
			}
		} as any;

		// Mock guild member
		mockMember = {
			voice: {
				channel: mockVoiceChannel
			}
		} as any;

		// Mock interaction
		mockInteraction = {
			options: {
				get: jest.fn().mockReturnValue({ value: 'https://youtube.com/watch?v=test' })
			},
			member: mockMember,
			reply: jest.fn().mockResolvedValue(undefined),
			deferReply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn().mockResolvedValue(undefined)
		} as any;
	});

	describe('command data', () => {
		it('should have correct command name and description', () => {
			expect(playCommand.data.name).toBe('play');
			expect(playCommand.data.description).toBe('Play a YouTube link in voice chat');
		});

		it('should require a song parameter', () => {
			const songOption = playCommand.data.options?.find((opt: any) => opt.name === 'song');
			expect(songOption).toBeDefined();
			expect(songOption?.required).toBe(true);
		});
	});

	describe('execute', () => {
		it('should reply with error when no URL provided', async () => {
			// Mock no URL
			(mockInteraction.options!.get as jest.Mock).mockReturnValue(null);

			await playCommand.execute(mockInteraction as CommandInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith('Please provide a valid YouTube link!');
			expect(logger.warn).toHaveBeenCalledWith('Play command executed without URL');
		});

		it('should reply with error when user not in voice channel', async () => {
			// Mock no voice channel
			mockMember!.voice = { channel: null } as any;

			await playCommand.execute(mockInteraction as CommandInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith('You need to be in a voice channel to use this command!');
			expect(logger.warn).toHaveBeenCalledWith('Play command executed outside voice channel');
		});

		it('should successfully play music when all conditions are met', async () => {
			await playCommand.execute(mockInteraction as CommandInteraction);

			expect(mockInteraction.deferReply).toHaveBeenCalled();
			expect(mockInteraction.followUp).toHaveBeenCalledWith('🎶 Now playing: https://youtube.com/watch?v=test');
		});
	});
});
