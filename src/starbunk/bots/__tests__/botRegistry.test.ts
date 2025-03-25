import { Message } from 'discord.js';
import { BotIdentity } from '../../types/botIdentity';
import { BotRegistry } from '../botRegistry';
import ReplyBot from '../replyBot';

// Mock ReplyBot implementation for testing
class MockBot extends ReplyBot {
	constructor(private readonly name: string) {
		super();
	}

	public get defaultBotName(): string {
		return this.name;
	}

	public get botIdentity(): BotIdentity | undefined {
		return {
			botName: this.name,
			avatarUrl: 'mock-url'
		};
	}

	protected async processMessage(_message: Message): Promise<void> {
		// Mock implementation
	}
}

describe('BotRegistry', () => {
	let registry: BotRegistry;
	let testBot1: MockBot;
	let testBot2: MockBot;

	beforeEach(() => {
		// Reset the singleton instance before each test
		(BotRegistry as any).instance = undefined;
		registry = BotRegistry.getInstance();
		testBot1 = new MockBot('TestBot1');
		testBot2 = new MockBot('TestBot2');
	});

	describe('getInstance', () => {
		it('should return the same instance', () => {
			const instance1 = BotRegistry.getInstance();
			const instance2 = BotRegistry.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('registerBot', () => {
		it('should register a bot and enable it by default', () => {
			registry.registerBot(testBot1);
			expect(registry.getAllBotNames()).toContain('TestBot1');
			expect(registry.isBotEnabled('TestBot1')).toBe(true);
		});

		it('should handle multiple bot registrations', () => {
			registry.registerBot(testBot1);
			registry.registerBot(testBot2);
			expect(registry.getAllBotNames()).toHaveLength(2);
			expect(registry.getAllBotNames()).toContain('TestBot1');
			expect(registry.getAllBotNames()).toContain('TestBot2');
		});
	});

	describe('enableBot/disableBot', () => {
		beforeEach(() => {
			registry.registerBot(testBot1);
		});

		it('should enable a registered bot', () => {
			registry.disableBot('TestBot1');
			expect(registry.isBotEnabled('TestBot1')).toBe(false);

			const success = registry.enableBot('TestBot1');
			expect(success).toBe(true);
			expect(registry.isBotEnabled('TestBot1')).toBe(true);
		});

		it('should disable a registered bot', () => {
			const success = registry.disableBot('TestBot1');
			expect(success).toBe(true);
			expect(registry.isBotEnabled('TestBot1')).toBe(false);
		});

		it('should return false when enabling an unregistered bot', () => {
			const success = registry.enableBot('NonExistentBot');
			expect(success).toBe(false);
		});

		it('should return false when disabling an unregistered bot', () => {
			const success = registry.disableBot('NonExistentBot');
			expect(success).toBe(false);
		});
	});

	describe('getAllBotNames', () => {
		it('should return empty array when no bots are registered', () => {
			expect(registry.getAllBotNames()).toHaveLength(0);
		});

		it('should return all registered bot names', () => {
			registry.registerBot(testBot1);
			registry.registerBot(testBot2);
			const names = registry.getAllBotNames();
			expect(names).toHaveLength(2);
			expect(names).toContain('TestBot1');
			expect(names).toContain('TestBot2');
		});
	});

	describe('isBotEnabled', () => {
		it('should return true for newly registered bots', () => {
			registry.registerBot(testBot1);
			expect(registry.isBotEnabled('TestBot1')).toBe(true);
		});

		it('should return true for unregistered bots (fail-safe)', () => {
			expect(registry.isBotEnabled('NonExistentBot')).toBe(true);
		});

		it('should track enabled state correctly', () => {
			registry.registerBot(testBot1);
			expect(registry.isBotEnabled('TestBot1')).toBe(true);

			registry.disableBot('TestBot1');
			expect(registry.isBotEnabled('TestBot1')).toBe(false);

			registry.enableBot('TestBot1');
			expect(registry.isBotEnabled('TestBot1')).toBe(true);
		});
	});
});
