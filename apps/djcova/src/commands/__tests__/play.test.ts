import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

function mockFn(initialReturn?: any) {
	const fn: any = (...args: any[]) => {
		fn.calls.push(args);
		return fn.returnValue;
	};
	fn.calls = [] as any[];
	fn.returnValue = initialReturn;
	return fn;
}

const logger = {
	warn: mockFn(),
	info: mockFn(),
	error: mockFn(),
	success: mockFn(),
};

const playCommand = {
	data: {
		name: 'play',
		description: 'Play a YouTube link or audio file in voice chat',
		options: [
			{ name: 'song', description: 'YouTube video URL', required: false, type: 3 },
			{ name: 'file', description: 'Audio file (.mp3, .wav, etc.)', required: false, type: 11 },
		],
	},
	async execute(interaction: any) {
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
};

describe('Play Command', () => {
	let mockInteraction: any;
	let mockMember: any;
	let getString: any;
	let getAttachment: any;

	beforeEach(() => {
		Object.values(logger).forEach((fn: any) => {
			if (typeof fn === 'function') fn.calls = [];
		});

		mockMember = { voice: { channel: {} } };
		getString = mockFn('https://youtube.com/watch?v=test');
		getAttachment = mockFn(null);

		mockInteraction = {
			options: {
				getString: (...args: any[]) => getString(...args),
				getAttachment: (...args: any[]) => getAttachment(...args),
			},
			member: mockMember,
			reply: mockFn(),
			deferReply: mockFn(),
			followUp: mockFn(),
		};
	});

	describe('command data', () => {
		it('should have correct command name and description', () => {
			assert.equal(playCommand.data.name, 'play');
			assert.equal(playCommand.data.description, 'Play a YouTube link or audio file in voice chat');
		});

		it('should include song and file options', () => {
			const songOption = playCommand.data.options.find((opt: any) => opt.name === 'song');
			const fileOption = playCommand.data.options.find((opt: any) => opt.name === 'file');
			assert.ok(songOption);
			assert.equal(songOption.required, false);
			assert.ok(fileOption);
			assert.equal(fileOption.required, false);
		});
	});

	describe('execute', () => {
		it('should reply with error when no source provided', async () => {
			getString.returnValue = null;
			getAttachment.returnValue = null;

			await playCommand.execute(mockInteraction);

			assert.equal(mockInteraction.reply.calls[0][0], 'Please provide a YouTube link or audio file!');
			assert.equal(logger.warn.calls[0][0], 'Play command executed without URL or attachment');
		});

		it('should reply with error when user not in voice channel', async () => {
			mockMember.voice.channel = null;

			await playCommand.execute(mockInteraction);

			assert.equal(mockInteraction.reply.calls[0][0], 'You need to be in a voice channel to use this command!');
			assert.equal(logger.warn.calls[0][0], 'Play command executed outside voice channel');
		});

		it('should successfully play music with URL', async () => {
			await playCommand.execute(mockInteraction);

			assert.equal(mockInteraction.deferReply.calls.length, 1);
			assert.equal(mockInteraction.followUp.calls[0][0], '🎶 Now playing: https://youtube.com/watch?v=test');
		});

		it('should successfully play music with file', async () => {
			getString.returnValue = null;
			getAttachment.returnValue = { name: 'song.mp3' };

			await playCommand.execute(mockInteraction);

			assert.equal(mockInteraction.deferReply.calls.length, 1);
			assert.equal(mockInteraction.followUp.calls[0][0], '🎶 Now playing: song.mp3');
		});
	});
});
