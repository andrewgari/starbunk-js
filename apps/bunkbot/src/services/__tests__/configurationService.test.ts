import { ConfigurationService } from '../configurationService';
import { BotIdentityService } from '../botIdentityService';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
jest.mock('@prisma/client');

describe('ConfigurationService', () => {
	let configService: ConfigurationService;
	let mockPrisma: jest.Mocked<PrismaClient>;

	beforeEach(() => {
		// Create mock Prisma client
		mockPrisma = {
			userConfiguration: {
				findUnique: jest.fn(),
				findFirst: jest.fn(),
				findMany: jest.fn(),
			},
			botConfiguration: {
				findUnique: jest.fn(),
				findMany: jest.fn(),
			},
			serverConfiguration: {
				findUnique: jest.fn(),
				findMany: jest.fn(),
			},
			$disconnect: jest.fn(),
		} as any;

		configService = new ConfigurationService(mockPrisma);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getUserConfig', () => {
		it('should return user config when user exists', async () => {
			// Arrange
			const mockUser = {
				userId: '85184539906809856',
				username: 'Chad',
				displayName: 'Chad',
				isActive: true,
			};
			mockPrisma.userConfiguration.findUnique.mockResolvedValue(mockUser);

			// Act
			const _result = await configService.getUserConfig('85184539906809856');

			// Assert
			expect(result).toEqual({
				userId: '85184539906809856',
				username: 'Chad',
				displayName: 'Chad',
				isActive: true,
			});
			expect(mockPrisma.userConfiguration.findUnique).toHaveBeenCalledWith({
				where: { userId: '85184539906809856' },
			});
		});

		it('should return null when user does not exist', async () => {
			// Arrange
			mockPrisma.userConfiguration.findUnique.mockResolvedValue(null);

			// Act
			const _result = await configService.getUserConfig('nonexistent');

			// Assert
			expect(result).toBeNull();
		});

		it('should handle database errors gracefully', async () => {
			// Arrange
			mockPrisma.userConfiguration.findUnique.mockRejectedValue(new Error('Database error'));

			// Act
			const _result = await configService.getUserConfig('85184539906809856');

			// Assert
			expect(result).toBeNull();
		});
	});

	describe('getUserIdByUsername', () => {
		it('should return user ID when username exists', async () => {
			// Arrange
			const mockUser = {
				userId: '85184539906809856',
				username: 'Chad',
				displayName: 'Chad',
				isActive: true,
			};
			mockPrisma.userConfiguration.findFirst.mockResolvedValue(mockUser);

			// Act
			const _result = await configService.getUserIdByUsername('Chad');

			// Assert
			expect(result).toBe('85184539906809856');
			expect(mockPrisma.userConfiguration.findFirst).toHaveBeenCalledWith({
				where: {
					username: {
						equals: 'Chad',
						mode: 'insensitive',
					},
				},
			});
		});

		it('should be case insensitive', async () => {
			// Arrange
			const mockUser = {
				userId: '85184539906809856',
				username: 'Chad',
				displayName: 'Chad',
				isActive: true,
			};
			mockPrisma.userConfiguration.findFirst.mockResolvedValue(mockUser);

			// Act
			const _result = await configService.getUserIdByUsername('chad');

			// Assert
			expect(result).toBe('85184539906809856');
		});

		it('should return null when username does not exist', async () => {
			// Arrange
			mockPrisma.userConfiguration.findFirst.mockResolvedValue(null);

			// Act
			const _result = await configService.getUserIdByUsername('NonExistent');

			// Assert
			expect(result).toBeNull();
		});
	});

	describe('getBotConfig', () => {
		it('should return bot config when bot exists', async () => {
			// Arrange
			const mockBot = {
				botName: 'chad-bot',
				displayName: 'Chad Bot',
				description: 'Responds to chad topics',
				isEnabled: true,
				avatarUrl: 'https://example.com/avatar.png',
				priority: 1,
				metadata: { responseChance: 1 },
			};
			mockPrisma.botConfiguration.findUnique.mockResolvedValue(mockBot);

			// Act
			const _result = await configService.getBotConfig('chad-bot');

			// Assert
			expect(result).toEqual({
				botName: 'chad-bot',
				displayName: 'Chad Bot',
				description: 'Responds to chad topics',
				isEnabled: true,
				avatarUrl: 'https://example.com/avatar.png',
				priority: 1,
				metadata: { responseChance: 1 },
			});
		});

		it('should return null when bot does not exist', async () => {
			// Arrange
			mockPrisma.botConfiguration.findUnique.mockResolvedValue(null);

			// Act
			const _result = await configService.getBotConfig('nonexistent-bot');

			// Assert
			expect(result).toBeNull();
		});
	});

	describe('refreshCache', () => {
		it('should preload all active configurations', async () => {
			// Arrange
			const mockUsers = [
				{ userId: '1', username: 'User1', displayName: 'User 1', isActive: true },
				{ userId: '2', username: 'User2', displayName: 'User 2', isActive: true },
			];
			const mockBots = [{ botName: 'bot1', displayName: 'Bot 1', isEnabled: true, priority: 1 }];
			const mockServers = [{ serverId: '1', serverName: 'Server 1', isActive: true }];

			mockPrisma.userConfiguration.findMany.mockResolvedValue(mockUsers);
			mockPrisma.botConfiguration.findMany.mockResolvedValue(mockBots);
			mockPrisma.serverConfiguration.findMany.mockResolvedValue(mockServers);

			// Act
			await configService.refreshCache();

			// Assert
			expect(mockPrisma.userConfiguration.findMany).toHaveBeenCalledWith({
				where: { isActive: true },
			});
			expect(mockPrisma.botConfiguration.findMany).toHaveBeenCalledWith({
				where: { isEnabled: true },
			});
			expect(mockPrisma.serverConfiguration.findMany).toHaveBeenCalledWith({
				where: { isActive: true },
			});
		});
	});
});

describe('BotIdentityService', () => {
	let identityService: BotIdentityService;
	let mockConfigService: jest.Mocked<ConfigurationService>;

	beforeEach(() => {
		mockConfigService = {
			getUserIdByUsername: jest.fn(),
			getUserConfig: jest.fn(),
		} as any;

		identityService = new BotIdentityService(mockConfigService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getBotIdentityByUsername', () => {
		it('should return bot identity when user exists', async () => {
			// Arrange
			mockConfigService.getUserIdByUsername.mockResolvedValue('85184539906809856');
			mockConfigService.getUserConfig.mockResolvedValue({
				userId: '85184539906809856',
				username: 'Chad',
				isActive: true,
			});

			// Mock the getServerSpecificIdentity method
			const mockGetServerSpecificIdentity = jest.spyOn(identityService as any, 'getServerSpecificIdentity');
			mockGetServerSpecificIdentity.mockResolvedValue({
				botName: 'ChadBot',
				avatarUrl: 'https://example.com/chad.png',
			});

			// Act
			const _result = await identityService.getBotIdentityByUsername('Chad', undefined, 'ChadBot');

			// Assert
			expect(mockConfigService.getUserIdByUsername).toHaveBeenCalledWith('Chad');
			expect(result).not.toBeNull();
			expect(result!.botName).toBe('ChadBot');
		});

		it('should return null when user not found (no fallback)', async () => {
			// Arrange
			mockConfigService.getUserIdByUsername.mockResolvedValue(null);

			// Act
			const _result = await identityService.getBotIdentityByUsername('NonExistent', undefined, 'FallbackBot');

			// Assert - Implementation returns null when user not found (bot remains silent)
			expect(result).toBeNull();
		});
	});

	describe('convenience methods', () => {
		it('should provide convenience methods for common users', async () => {
			// Arrange
			mockConfigService.getUserIdByUsername.mockResolvedValue('85184539906809856');

			// Act & Assert
			expect(typeof identityService.getChadIdentity).toBe('function');
			expect(typeof identityService.getGuyIdentity).toBe('function');
			expect(typeof identityService.getVennIdentity).toBe('function');
			expect(typeof identityService.getCovaIdentity).toBe('function');
		});
	});
});
