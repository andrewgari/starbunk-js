import channelIDs from '@/discord/channelIDs';
import userID from '@/discord/userID';
import { Logger } from '@/services/Logger';
import GuyChannelBot from '@/starbunk/bots/voice-bots/GuyChannelBot';
import { Client, GuildMember, VoiceChannel, VoiceState } from 'discord.js';

describe('GuyChannelBot', () => {
	let guyChannelBot: GuyChannelBot;
	let mockLogger: typeof Logger;
	let mockOldState: Partial<VoiceState>;
	let mockNewState: Partial<VoiceState>;
	let mockLounge: Partial<VoiceChannel>;
	let mockGuy: GuildMember;

	beforeEach(() => {
		// Mock logger
		mockLogger = {
			warn: jest.fn(),
			debug: jest.fn()
		} as unknown as typeof Logger;

		// Mock voice channel
		mockLounge = {
			name: 'Lounge 1'
		} as unknown as VoiceChannel;

		// Mock Guy member similar to guyBot.test.ts
		mockGuy = {
			id: userID.Guy,
			displayName: 'Guy',
			voice: {
				setChannel: jest.fn()
			}
		} as unknown as GuildMember;

		// Setup voice states
		mockOldState = {
			channelId: undefined,
			member: mockGuy,
			client: {
				channels: {
					fetch: jest.fn().mockResolvedValue(mockLounge)
				}
			} as unknown as Client<true>,
			valueOf: () => ''
		} as unknown as VoiceState;

		mockNewState = { ...mockOldState };

		guyChannelBot = new GuyChannelBot({ logger: mockLogger });
	});

	it('should have correct name', () => {
		expect(guyChannelBot.getBotName()).toBe('Guy Channel Bot');
	});

	it('should warn if member info is missing', async () => {
		const testState = { ...mockOldState, member: undefined } as unknown as VoiceState;
		guyChannelBot.handleEvent(testState, mockNewState as VoiceState);
		expect(mockLogger.warn).toHaveBeenCalledWith('Received voice state update without member information');
	});

	describe('Guy-specific rules', () => {
		beforeEach(() => {
			mockGuy = {
				...mockGuy,
				id: userID.Guy
			} as unknown as GuildMember;
		});

		it('should redirect Guy from No-Guy-Lounge to Lounge1', async () => {
			mockNewState.channelId = channelIDs.NoGuyLounge;
			guyChannelBot.handleEvent(mockOldState as VoiceState, mockNewState as VoiceState);

			await Promise.resolve(); // Wait for async channel fetch
			expect(mockGuy.voice?.setChannel).toHaveBeenCalledWith(mockLounge);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Guy tried to join No-Guy-Lounge')
			);
		});

		it('should allow Guy to stay in GuyLounge', async () => {
			mockNewState.channelId = channelIDs.GuyLounge;
			guyChannelBot.handleEvent(mockOldState as VoiceState, mockNewState as VoiceState);

			await Promise.resolve();
			expect(mockGuy.voice?.setChannel).not.toHaveBeenCalled();
			expect(mockLogger.warn).not.toHaveBeenCalled();
		});
	});

	describe('Non-Guy rules', () => {
		beforeEach(() => {
			mockGuy = {
				...mockGuy,
				id: 'non-guy-id',
				displayName: 'Non Guy User'
			} as unknown as GuildMember;
			// Update states with new mockGuy
			mockOldState = { ...mockOldState, member: mockGuy };
			mockNewState = { ...mockOldState };
		});

		it('should redirect non-Guy users from GuyLounge to Lounge1', async () => {
			mockNewState.channelId = channelIDs.GuyLounge;
			guyChannelBot.handleEvent(mockOldState as VoiceState, mockNewState as VoiceState);

			await Promise.resolve(); // Wait for async channel fetch
			expect(mockGuy.voice?.setChannel).toHaveBeenCalledWith(mockLounge);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('tried to join Guy\'s lounge')
			);
		});

		it('should allow non-Guy users to stay in NoGuyLounge', async () => {
			mockNewState.channelId = channelIDs.NoGuyLounge;
			guyChannelBot.handleEvent(mockOldState as VoiceState, mockNewState as VoiceState);

			await Promise.resolve();
			expect(mockGuy.voice?.setChannel).not.toHaveBeenCalled();
			expect(mockLogger.warn).not.toHaveBeenCalled();
		});
	});

	it('should log channel movements', async () => {
		mockOldState.channelId = 'old-channel';
		mockNewState.channelId = 'new-channel';
		guyChannelBot.handleEvent(mockOldState as VoiceState, mockNewState as VoiceState);

		await Promise.resolve(); // Wait for async channel fetch
		expect(mockLogger.debug).toHaveBeenCalledWith(
			expect.stringContaining('moved from old-channel to new-channel')
		);
	});
});
