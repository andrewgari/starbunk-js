import { BotIdentityService } from '../botIdentityService';
import { ConfigurationService } from '../configurationService';
import { Message, Guild, GuildMember, User } from 'discord.js';

// Helper: mock Discord.js Message with guild id
const createMockMessage = (guildId: string): Partial<Message> =>
	({
		guild: {
			id: guildId,
			name: 'Test Guild',
		} as Guild,
	}) as Partial<Message>;

// Helper: create a mock GuildMember with flexible fields
const createMockGuildMember = (
	userId: string,
	username: string,
	nickname?: string,
	serverAvatarUrl?: string,
	globalAvatarUrl?: string,
): Partial<GuildMember> => ({
	id: userId,
	nickname: nickname || null,
	user: {
		id: userId,
		username,
		globalName: username,
		displayAvatarURL: jest
			.fn()
			.mockReturnValue(globalAvatarUrl || `https://cdn.discordapp.com/avatars/${userId}/global.png`),
	} as unknown as User,
	displayAvatarURL: jest.fn().mockReturnValue(serverAvatarUrl),
});

// Mock the @starbunk/shared container + logger once for all tests
jest.mock('@starbunk/shared', () => ({
	container: {
		get: jest.fn().mockReturnValue({
			getMemberAsync: jest.fn(),
			getMemberAsBotIdentity: jest.fn(),
		}),
	},
	ServiceId: {
		DiscordService: 'DiscordService',
	},
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

describe('BotIdentityService.getCovaIdentity', () => {
	const COVA_USER_ID = '151120340343455744';
	let identityService: BotIdentityService;
	let mockConfig: jest.Mocked<ConfigurationService>;
	let mockDiscordService: any;

	beforeEach(() => {
		// Fresh mocks per test
		mockConfig = {
			getUserIdByUsername: jest.fn(),
			getUserConfig: jest.fn(),
		} as any;

		// By default, mark Cova user as active so identity resolution proceeds
		(mockConfig.getUserConfig as jest.Mock).mockResolvedValue({
			id: COVA_USER_ID,
			username: 'Cova',
			isActive: true,
		});

		const { container } = require('@starbunk/shared');
		mockDiscordService = container.get();
		mockDiscordService.getMemberAsync.mockReset();
		mockDiscordService.getMemberAsBotIdentity.mockReset();

		identityService = new BotIdentityService(mockConfig);
	});

	afterEach(() => {
		jest.clearAllMocks();
		identityService.clearCache();
	});

	it('maps to the Cova user and prefers server nickname + server avatar', async () => {
		mockConfig.getUserIdByUsername.mockResolvedValue(COVA_USER_ID);

		const guildId = 'guild-A';
		const message = createMockMessage(guildId) as Message;

		const member = createMockGuildMember(
			COVA_USER_ID,
			'Cova',
			'Cova Nick',
			'https://example.com/server-avatar.png',
			'https://example.com/global-avatar.png',
		);

		mockDiscordService.getMemberAsync.mockResolvedValue(member);

		const identity = await identityService.getCovaIdentity(message);

		expect(mockConfig.getUserIdByUsername).toHaveBeenCalledWith('Cova');
		expect(mockDiscordService.getMemberAsync).toHaveBeenCalledWith(guildId, COVA_USER_ID);
		expect(identity).not.toBeNull();
		expect(identity!.botName).toBe('Cova Nick');
		expect(identity!.avatarUrl).toBe('https://example.com/server-avatar.png');
	});

	it('falls back to username when no nickname; uses global avatar when no server avatar', async () => {
		mockConfig.getUserIdByUsername.mockResolvedValue(COVA_USER_ID);

		const guildId = 'guild-B';
		const message = createMockMessage(guildId) as Message;

		const member = createMockGuildMember(
			COVA_USER_ID,
			'Cova',
			null, // no nickname
			undefined, // no server avatar
			'https://example.com/global-avatar.png',
		);

		mockDiscordService.getMemberAsync.mockResolvedValue(member);

		const identity = await identityService.getCovaIdentity(message);
		expect(identity).not.toBeNull();
		expect(identity!.botName).toBe('Cova');
		expect(identity!.avatarUrl).toBe('https://example.com/global-avatar.png');
	});

	it('caches per guild: second call in same guild hits cache; different guild fetches again', async () => {
		mockConfig.getUserIdByUsername.mockResolvedValue(COVA_USER_ID);

		const messageA = createMockMessage('guild-A') as Message;
		const messageB = createMockMessage('guild-B') as Message;

		mockDiscordService.getMemberAsync
			.mockResolvedValueOnce(createMockGuildMember(COVA_USER_ID, 'Cova', 'A-Nick', 'srvA.png'))
			.mockResolvedValueOnce(createMockGuildMember(COVA_USER_ID, 'Cova', 'B-Nick', 'srvB.png'));

		const idA1 = await identityService.getCovaIdentity(messageA);
		const idA2 = await identityService.getCovaIdentity(messageA); // should be cache hit
		const idB1 = await identityService.getCovaIdentity(messageB);

		expect(idA1!.botName).toBe('A-Nick');
		expect(idA2!.botName).toBe('A-Nick');
		expect(idB1!.botName).toBe('B-Nick');

		// Only two Discord fetches total: one per guild
		expect(mockDiscordService.getMemberAsync).toHaveBeenCalledTimes(2);

		const stats = identityService.getCacheStats();
		// Ensure username-based cache entries exist for both guilds
		expect(stats.keys).toEqual(
			expect.arrayContaining([
				expect.stringContaining('username:cova:guild-A'),
				expect.stringContaining('username:cova:guild-B'),
			]),
		);
	});

	it('returns null (silent) when Cova user not found in configuration', async () => {
		mockConfig.getUserIdByUsername.mockResolvedValue(undefined as any);

		const message = createMockMessage('guild-A') as Message;
		const identity = await identityService.getCovaIdentity(message);

		expect(identity).toBeNull();
		expect(mockDiscordService.getMemberAsync).not.toHaveBeenCalled();
	});

	it('returns null (silent) when Discord lookups fail completely (no generic fallback)', async () => {
		mockConfig.getUserIdByUsername.mockResolvedValue(COVA_USER_ID);

		const message = createMockMessage('guild-A') as Message;

		// First attempt: server-specific identity fails
		mockDiscordService.getMemberAsync.mockRejectedValue(new Error('Discord API Error'));
		// Fallback inside get-bot-identity also fails
		mockDiscordService.getMemberAsBotIdentity.mockRejectedValue(new Error('Fallback failed'));

		const identity = await identityService.getCovaIdentity(message);

		expect(identity).toBeNull();
		expect(mockDiscordService.getMemberAsync).toHaveBeenCalled();
		expect(mockDiscordService.getMemberAsBotIdentity).toHaveBeenCalled();
	});

	it('expires cache after 1 hour and refetches identity on next call', async () => {
		const COVA_ID = COVA_USER_ID;
		mockConfig.getUserIdByUsername.mockResolvedValue(COVA_ID);
		(mockConfig.getUserConfig as jest.Mock).mockResolvedValue({ id: COVA_ID, username: 'Cova', isActive: true });

		const guildId = 'guild-ttl';
		const message = createMockMessage(guildId) as Message;

		// Control time via Date.now spy
		const baseNow = Date.now();
		let fakeNow = baseNow;
		const dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => fakeNow);

		// First fetch -> caches
		mockDiscordService.getMemberAsync.mockResolvedValueOnce(
			createMockGuildMember(COVA_ID, 'Cova', 'FirstNick', 'first.png'),
		);
		const first = await identityService.getCovaIdentity(message);
		expect(first!.botName).toBe('FirstNick');

		// Advance logical time beyond 1 hour to expire cache
		fakeNow = baseNow + 60 * 60 * 1000 + 1;

		// Second call should refetch from Discord and cache new value
		mockDiscordService.getMemberAsync.mockResolvedValueOnce(
			createMockGuildMember(COVA_ID, 'Cova', 'SecondNick', 'second.png'),
		);
		const second = await identityService.getCovaIdentity(message);

		expect(second).not.toBeNull();
		expect(second!.botName).toBe('SecondNick');
		expect(mockDiscordService.getMemberAsync).toHaveBeenCalledTimes(2);

		// Cleanup
		dateNowSpy.mockRestore();
	});
});
