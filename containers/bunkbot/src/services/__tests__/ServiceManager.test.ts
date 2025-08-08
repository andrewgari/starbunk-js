import { ServiceManager } from '../ServiceManager';
import { logger } from '@starbunk/shared';

// Mock external dependencies
jest.mock('@starbunk/shared', () => ({
	logger: {
		info: jest.fn(),
		debug: jest.fn(),
		error: jest.fn(),
	},
	container: {
		register: jest.fn(),
	},
	ServiceId: {
		DiscordClient: 'DiscordClient',
		DiscordService: 'DiscordService',
		WebhookService: 'WebhookService',
		MessageFilter: 'MessageFilter',
	},
	createDiscordClient: jest.fn(() => mockClient),
	ClientConfigs: {
		BunkBot: 'BunkBot',
	},
	WebhookManager: jest.fn().mockImplementation(() => ({})),
	getMessageFilter: jest.fn(() => ({})),
	runStartupDiagnostics: jest.fn(() => Promise.resolve([])),
	validateEnvironment: jest.fn(),
}));

jest.mock('@starbunk/shared/dist/services/discordService', () => ({
	DiscordService: jest.fn().mockImplementation(() => ({})),
}));

const mockClient = {
	isReady: jest.fn(() => true),
};

describe('ServiceManager', () => {
	beforeEach(() => {
		// Reset singleton
		ServiceManager.reset();
		jest.clearAllMocks();
	});

	describe('getInstance', () => {
		it('should return singleton instance', () => {
			const instance1 = ServiceManager.getInstance();
			const instance2 = ServiceManager.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('initialize', () => {
		it('should initialize services successfully', async () => {
			const serviceManager = ServiceManager.getInstance();
			
			await serviceManager.initialize();
			
			expect(serviceManager.isInitialized()).toBe(true);
			expect(logger.info).toHaveBeenCalledWith('✅ ServiceManager initialized successfully');
		});

		it('should not reinitialize if already initialized', async () => {
			const serviceManager = ServiceManager.getInstance();
			
			await serviceManager.initialize();
			await serviceManager.initialize();
			
			expect(logger.info).toHaveBeenCalledTimes(2); // One for 'Core services initialized', one for success
		});
	});

	describe('getClient', () => {
		it('should return client after initialization', async () => {
			const serviceManager = ServiceManager.getInstance();
			await serviceManager.initialize();
			
			const client = serviceManager.getClient();
			
			expect(client).toBe(mockClient);
		});

		it('should throw error if not initialized', () => {
			const serviceManager = ServiceManager.getInstance();
			
			expect(() => serviceManager.getClient()).toThrow('ServiceManager not initialized');
		});
	});

	describe('getMessageFilter', () => {
		it('should return message filter after initialization', async () => {
			const serviceManager = ServiceManager.getInstance();
			await serviceManager.initialize();
			
			const messageFilter = serviceManager.getMessageFilter();
			
			expect(messageFilter).toBeDefined();
		});

		it('should throw error if not initialized', () => {
			const serviceManager = ServiceManager.getInstance();
			
			expect(() => serviceManager.getMessageFilter()).toThrow('MessageFilter not initialized');
		});
	});
});