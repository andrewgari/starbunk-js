import { Client, GuildMember, VoiceChannel, VoiceState } from 'discord.js';
import channelIDs from '../../../discord/channelIDs';
import userID from '../../../discord/userID';
import { Logger } from '../../../services/logger';
import GuyChannelBot, {
	ChannelRedirectRule,
	GuyNoGuyLoungeRule,
	NonGuyGuyLoungeRule,
	VoiceChannelRuleHandler,
	VoiceStateHandler
} from './guyChannelBot';

// Mock the Logger
jest.mock('../../../services/logger', () => ({
	Logger: {
		debug: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		info: jest.fn()
	}
}));

describe('GuyChannelBot', () => {
	// Helper function to create mock voice states
	const createMockVoiceState = (
		memberId: string,
		memberName: string,
		oldChannelId: string | null,
		newChannelId: string | null
	): { oldState: VoiceState; newState: VoiceState } => {
		// Create mock channel
		const mockChannel = {
			name: 'Test Channel',
			id: 'channel-id'
		} as unknown as VoiceChannel;

		// Create mock member
		const mockMember = {
			id: memberId,
			displayName: memberName,
			voice: {
				setChannel: jest.fn().mockResolvedValue(undefined)
			}
		} as unknown as GuildMember;

		// Create mock client
		const mockClient = {
			channels: {
				fetch: jest.fn().mockResolvedValue(mockChannel)
			}
		} as unknown as Client<true>;

		// Create the voice states with valueOf method
		const oldState = {
			member: mockMember,
			channelId: oldChannelId,
			client: mockClient,
			valueOf: () => ''
		} as unknown as VoiceState;

		const newState = {
			member: mockMember,
			channelId: newChannelId,
			client: mockClient,
			valueOf: () => ''
		} as unknown as VoiceState;

		return { oldState, newState };
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('GuyChannelBot class', () => {
		it('should have the correct name', () => {
			const bot = new GuyChannelBot();
			expect(bot.getBotName()).toBe('Guy Channel Bot');
		});

		it('should delegate event handling to the handler', async () => {
			// Create mock handler
			const mockHandler: VoiceStateHandler = {
				handleVoiceState: jest.fn().mockResolvedValue(undefined)
			};

			// Create bot with mock handler
			const bot = new GuyChannelBot({ handler: mockHandler });

			// Create mock voice states
			const { oldState, newState } = createMockVoiceState(
				'user-id',
				'Test User',
				null,
				'channel-id'
			);

			// Call handleEvent
			await bot.handleEvent(oldState, newState);

			// Verify handler was called
			expect(mockHandler.handleVoiceState).toHaveBeenCalledWith(
				oldState,
				newState
			);
		});
	});

	describe('GuyNoGuyLoungeRule', () => {
		const rule = new GuyNoGuyLoungeRule();

		it('should redirect Guy from NoGuyLounge', () => {
			const mockMember = { id: userID.Guy } as GuildMember;
			expect(rule.shouldRedirect(mockMember, channelIDs.NoGuyLounge)).toBe(true);
		});

		it('should not redirect Guy from other channels', () => {
			const mockMember = { id: userID.Guy } as GuildMember;
			expect(rule.shouldRedirect(mockMember, 'other-channel')).toBe(false);
		});

		it('should not redirect other users from NoGuyLounge', () => {
			const mockMember = { id: 'other-user' } as GuildMember;
			expect(rule.shouldRedirect(mockMember, channelIDs.NoGuyLounge)).toBe(false);
		});

		it('should redirect to Lounge1', () => {
			expect(rule.getRedirectChannelId()).toBe(channelIDs.Lounge1);
		});
	});

	describe('NonGuyGuyLoungeRule', () => {
		const rule = new NonGuyGuyLoungeRule();

		it('should redirect non-Guy users from GuyLounge', () => {
			const mockMember = { id: 'other-user' } as GuildMember;
			expect(rule.shouldRedirect(mockMember, channelIDs.GuyLounge)).toBe(true);
		});

		it('should not redirect non-Guy users from other channels', () => {
			const mockMember = { id: 'other-user' } as GuildMember;
			expect(rule.shouldRedirect(mockMember, 'other-channel')).toBe(false);
		});

		it('should not redirect Guy from GuyLounge', () => {
			const mockMember = { id: userID.Guy } as GuildMember;
			expect(rule.shouldRedirect(mockMember, channelIDs.GuyLounge)).toBe(false);
		});

		it('should redirect to Lounge1', () => {
			expect(rule.getRedirectChannelId()).toBe(channelIDs.Lounge1);
		});
	});

	describe('VoiceChannelRuleHandler', () => {
		it('should log a warning when member is missing', async () => {
			const handler = new VoiceChannelRuleHandler([]);
			const oldState = { channelId: null, valueOf: () => '' } as unknown as VoiceState;
			const newState = { channelId: 'channel-id', member: null, valueOf: () => '' } as unknown as VoiceState;

			await handler.handleVoiceState(oldState, newState);
			expect(Logger.warn).toHaveBeenCalledWith('Received voice state update without member information');
		});

		it('should log channel movements', async () => {
			const handler = new VoiceChannelRuleHandler([]);
			const { oldState, newState } = createMockVoiceState(
				'user-id',
				'Test User',
				'old-channel',
				'new-channel'
			);

			await handler.handleVoiceState(oldState, newState);
			expect(Logger.debug).toHaveBeenCalledWith(
				expect.stringContaining('Test User moved from old-channel to new-channel')
			);
		});

		it('should apply matching rules and redirect users', async () => {
			// Create a mock rule that always matches
			const mockRule: ChannelRedirectRule = {
				shouldRedirect: jest.fn().mockReturnValue(true),
				getRedirectChannelId: jest.fn().mockReturnValue('redirect-channel')
			};

			const handler = new VoiceChannelRuleHandler([mockRule]);
			const { oldState, newState } = createMockVoiceState(
				'user-id',
				'Test User',
				null,
				'channel-id'
			);

			await handler.handleVoiceState(oldState, newState);

			// Verify rule was checked
			expect(mockRule.shouldRedirect).toHaveBeenCalledWith(newState.member, 'channel-id');
			expect(mockRule.getRedirectChannelId).toHaveBeenCalled();

			// Verify channel fetch and redirect
			expect(newState.client?.channels.fetch).toHaveBeenCalledWith('redirect-channel');
			expect(newState.member?.voice.setChannel).toHaveBeenCalled();
		});

		it('should handle Guy-specific redirects with appropriate logging', async () => {
			// Create a mock rule that matches for Guy
			const mockRule: ChannelRedirectRule = {
				shouldRedirect: jest.fn().mockReturnValue(true),
				getRedirectChannelId: jest.fn().mockReturnValue('redirect-channel')
			};

			const handler = new VoiceChannelRuleHandler([mockRule]);
			const { oldState, newState } = createMockVoiceState(
				userID.Guy,
				'Guy',
				null,
				channelIDs.NoGuyLounge
			);

			await handler.handleVoiceState(oldState, newState);

			// Verify appropriate warning was logged
			expect(Logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Guy tried to join No-Guy-Lounge')
			);
		});

		it('should handle non-Guy redirects with appropriate logging', async () => {
			// Create a mock rule that matches for non-Guy users
			const mockRule: ChannelRedirectRule = {
				shouldRedirect: jest.fn().mockReturnValue(true),
				getRedirectChannelId: jest.fn().mockReturnValue('redirect-channel')
			};

			const handler = new VoiceChannelRuleHandler([mockRule]);
			const { oldState, newState } = createMockVoiceState(
				'other-user',
				'Other User',
				null,
				channelIDs.GuyLounge
			);

			await handler.handleVoiceState(oldState, newState);

			// Verify appropriate warning was logged
			expect(Logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('User Other User tried to join Guy\'s lounge')
			);
		});

		it('should handle errors during redirection', async () => {
			// Create a mock rule that matches
			const mockRule: ChannelRedirectRule = {
				shouldRedirect: jest.fn().mockReturnValue(true),
				getRedirectChannelId: jest.fn().mockReturnValue('redirect-channel')
			};

			const handler = new VoiceChannelRuleHandler([mockRule]);
			const { oldState, newState } = createMockVoiceState(
				'user-id',
				'Test User',
				null,
				'channel-id'
			);

			// Make the channel fetch throw an error
			(newState.client?.channels.fetch as jest.Mock).mockRejectedValue(new Error('Channel not found'));

			await handler.handleVoiceState(oldState, newState);

			// Verify error was logged
			expect(Logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('Failed to redirect user Test User')
			);
		});
	});

	describe('Integration tests', () => {
		it('should redirect Guy from NoGuyLounge', async () => {
			const bot = new GuyChannelBot();
			const { oldState, newState } = createMockVoiceState(
				userID.Guy,
				'Guy',
				null,
				channelIDs.NoGuyLounge
			);

			await bot.handleEvent(oldState, newState);

			// Verify channel fetch and redirect
			expect(newState.client?.channels.fetch).toHaveBeenCalledWith(channelIDs.Lounge1);
			expect(newState.member?.voice.setChannel).toHaveBeenCalled();
		});

		it('should redirect non-Guy users from GuyLounge', async () => {
			const bot = new GuyChannelBot();
			const { oldState, newState } = createMockVoiceState(
				'other-user',
				'Other User',
				null,
				channelIDs.GuyLounge
			);

			await bot.handleEvent(oldState, newState);

			// Verify channel fetch and redirect
			expect(newState.client?.channels.fetch).toHaveBeenCalledWith(channelIDs.Lounge1);
			expect(newState.member?.voice.setChannel).toHaveBeenCalled();
		});

		it('should not redirect Guy to GuyLounge', async () => {
			const bot = new GuyChannelBot();
			const { oldState, newState } = createMockVoiceState(
				userID.Guy,
				'Guy',
				null,
				channelIDs.GuyLounge
			);

			await bot.handleEvent(oldState, newState);

			// Verify no redirect happened
			expect(newState.member?.voice.setChannel).not.toHaveBeenCalled();
		});

		it('should not redirect non-Guy users to regular channels', async () => {
			const bot = new GuyChannelBot();
			const { oldState, newState } = createMockVoiceState(
				'other-user',
				'Other User',
				null,
				'regular-channel'
			);

			await bot.handleEvent(oldState, newState);

			// Verify no redirect happened
			expect(newState.member?.voice.setChannel).not.toHaveBeenCalled();
		});
	});
});
