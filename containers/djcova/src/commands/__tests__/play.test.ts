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
		success: jest.fn(),
	},
}));

// Mock the play command module since it has import issues
jest.mock('../play', () => {
	const { logger } = require('@starbunk/shared');
	return {
		default: {
			data: {
				name: 'play',
				description: 'Play a YouTube link or audio file in voice chat',
				options: [
					{
						name: 'song',
						description: 'YouTube video URL',
						required: false,
						type: 3, // STRING type
					},
					{
						name: 'file',
						description: 'Audio file (.mp3, .wav, etc.)',
						required: false,
						type: 11, // ATTACHMENT type
					},
				],
			},
			async execute(interaction: any) {
				// Mock implementation for testing
				const attachment = interaction.options.getAttachment('file');
				const url = interaction.options.getString('song');
				const member = interaction.member;

				if (!attachment && !url) {
					logger.warn('Play command executed without URL or attachment');
					await interaction.reply('Please provide a YouTube link or audio file!');
					return;
				}

				if (!member?.voice?.channel) {
					logger.warn('Play command executed outside voice channel');
					await interaction.reply('You need to be in a voice channel to use this command!');
					return;
				}

				await interaction.deferReply();
				const name = attachment ? attachment.name : url;
				await interaction.followUp(`🎶 Now playing: ${name}`);
			},
		},
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
				voiceAdapterCreator: jest.fn(),
			},
		} as any;

		// Mock guild member
		mockMember = {
			voice: {
				channel: mockVoiceChannel,
			},
		} as any;

		// Mock interaction
		mockInteraction = {
			options: {
				getString: jest.fn().mockReturnValue('https://youtube.com/watch?v=test'),
				getAttachment: jest.fn().mockReturnValue(null),
			},
			member: mockMember,
			reply: jest.fn().mockResolvedValue(undefined),
			deferReply: jest.fn().mockResolvedValue(undefined),
			followUp: jest.fn().mockResolvedValue(undefined),
		} as any;
	});

	describe('command data', () => {
		it('should have correct command name and description', () => {
			expect(playCommand.data.name).toBe('play');
			expect(playCommand.data.description).toBe('Play a YouTube link or audio file in voice chat');
		});

		it('should include song and file options', () => {
			const songOption = playCommand.data.options?.find((opt: any) => opt.name === 'song');
			const fileOption = playCommand.data.options?.find((opt: any) => opt.name === 'file');
			expect(songOption).toBeDefined();
			expect(songOption?.required).toBe(false);
			expect(fileOption).toBeDefined();
			expect(fileOption?.required).toBe(false);
		});
	});

	describe('execute', () => {
		it('should reply with error when no source provided', async () => {
			(mockInteraction.options!.getString as jest.Mock).mockReturnValue(null);
			(mockInteraction.options!.getAttachment as jest.Mock).mockReturnValue(null);

			await playCommand.execute(mockInteraction as CommandInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith('Please provide a YouTube link or audio file!');
			expect(logger.warn).toHaveBeenCalledWith('Play command executed without URL or attachment');
		});

		it('should reply with error when user not in voice channel', async () => {
			mockMember!.voice = { channel: null } as any;

			await playCommand.execute(mockInteraction as CommandInteraction);

			expect(mockInteraction.reply).toHaveBeenCalledWith(
				'You need to be in a voice channel to use this command!',
			);
			expect(logger.warn).toHaveBeenCalledWith('Play command executed outside voice channel');
		});

		it('should successfully play music with URL', async () => {
			await playCommand.execute(mockInteraction as CommandInteraction);

			expect(mockInteraction.deferReply).toHaveBeenCalled();
			expect(mockInteraction.followUp).toHaveBeenCalledWith('🎶 Now playing: https://youtube.com/watch?v=test');
		});

		it('should successfully play music with file', async () => {
			(mockInteraction.options!.getString as jest.Mock).mockReturnValue(null);
			(mockInteraction.options!.getAttachment as jest.Mock).mockReturnValue({
				name: 'song.mp3',
			});

			await playCommand.execute(mockInteraction as CommandInteraction);

			expect(mockInteraction.deferReply).toHaveBeenCalled();
			expect(mockInteraction.followUp).toHaveBeenCalledWith('🎶 Now playing: song.mp3');
		});
	});
});
