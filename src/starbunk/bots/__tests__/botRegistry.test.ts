import { Message, TextChannel } from 'discord.js';
import { BotIdentity } from '../../types/botIdentity';
import { BotRegistry } from '../botRegistry';
import ReplyBot from '../replyBot';

class MockBot extends ReplyBot {
	private readonly name: string;

	constructor(botName: string) {
		super();
		this.name = botName;
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

	protected async sendReply(channel: TextChannel, content: string): Promise<void> {
		// Mock implementation
		await channel.send(content);
	}
}

describe('BotRegistry', () => {
	let registry: BotRegistry;
	let testBot: MockBot;

	beforeEach(() => {
		// Reset the singleton instance using the dedicated reset method
		BotRegistry.reset();
		registry = BotRegistry.getInstance();
		testBot = new MockBot('TestBot');
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
			registry.registerBot(testBot);
			expect(registry.getAllBotNames()).toContain('TestBot');
			expect(registry.isBotEnabled('TestBot')).toBe(true);
		});
	});

	describe('enableBot/disableBot', () => {
		beforeEach(() => {
			registry.registerBot(testBot);
		});

		it('should enable a registered bot', () => {
			registry.disableBot('TestBot');
			expect(registry.isBotEnabled('TestBot')).toBe(false);

			const success = registry.enableBot('TestBot');
			expect(success).toBe(true);
			expect(registry.isBotEnabled('TestBot')).toBe(true);
		});

		it('should disable a registered bot', () => {
			const success = registry.disableBot('TestBot');
			expect(success).toBe(true);
			expect(registry.isBotEnabled('TestBot')).toBe(false);
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
			registry.registerBot(testBot);
			const names = registry.getAllBotNames();
			expect(names).toHaveLength(1);
			expect(names).toContain('TestBot');
		});
	});

	describe('isBotEnabled', () => {
		it('should return true for newly registered bots', () => {
			registry.registerBot(testBot);
			expect(registry.isBotEnabled('TestBot')).toBe(true);
		});

		it('should return true for unregistered bots (fail-safe)', () => {
			expect(registry.isBotEnabled('NonExistentBot')).toBe(true);
		});

		it('should track enabled state correctly', () => {
			registry.registerBot(testBot);
			expect(registry.isBotEnabled('TestBot')).toBe(true);

			registry.disableBot('TestBot');
			expect(registry.isBotEnabled('TestBot')).toBe(false);

			registry.enableBot('TestBot');
			expect(registry.isBotEnabled('TestBot')).toBe(true);
		});
	});

	describe('bot registration and state management', () => {
		it('should register a bot', () => {
			registry.registerBot(testBot);
			expect(registry.getAllBotNames()).toContain('TestBot');
		});

		it('should enable a registered bot', () => {
			registry.registerBot(testBot);
			const success = registry.enableBot('TestBot');
			expect(success).toBe(true);
			expect(registry.isBotEnabled('TestBot')).toBe(true);
		});

		it('should disable a registered bot', () => {
			registry.registerBot(testBot);
			const success = registry.disableBot('TestBot');
			expect(success).toBe(true);
			expect(registry.isBotEnabled('TestBot')).toBe(false);
		});

		it('should return false when enabling non-existent bot', () => {
			const success = registry.enableBot('NonExistentBot');
			expect(success).toBe(false);
		});

		it('should return false when disabling non-existent bot', () => {
			const success = registry.disableBot('NonExistentBot');
			expect(success).toBe(false);
		});

		it('should return true for isBotEnabled on unregistered bot', () => {
			expect(registry.isBotEnabled('UnregisteredBot')).toBe(true);
		});
	});

	describe('frequency management', () => {
		beforeEach(() => {
			registry.registerBot(testBot);
		});

		it('should set bot frequency', () => {
			const success = registry.setBotFrequency('TestBot', 50);
			expect(success).toBe(true);
			expect(registry.getBotFrequency('TestBot')).toBe(50);
		});

		it('should return false when setting frequency for non-existent bot', () => {
			const success = registry.setBotFrequency('NonExistentBot', 50);
			expect(success).toBe(false);
		});

		it('should return 0 when getting frequency for non-existent bot', () => {
			const rate = registry.getBotFrequency('NonExistentBot');
			expect(rate).toBe(0);
		});

		it('should maintain default response rate of 100%', () => {
			expect(registry.getBotFrequency('TestBot')).toBe(100);
		});

		it('should update response rate to new value', () => {
			registry.setBotFrequency('TestBot', 25);
			expect(registry.getBotFrequency('TestBot')).toBe(25);
		});

		it('should handle 0% response rate', () => {
			registry.setBotFrequency('TestBot', 0);
			expect(registry.getBotFrequency('TestBot')).toBe(0);
		});

		it('should handle 100% response rate', () => {
			registry.setBotFrequency('TestBot', 100);
			expect(registry.getBotFrequency('TestBot')).toBe(100);
		});
	});
});
