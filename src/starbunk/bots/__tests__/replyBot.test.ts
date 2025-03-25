import { Message } from 'discord.js';
import { container, ServiceId } from '../../../services/container';
import { percentChance } from '../../../utils/random';
import ReplyBot from '../replyBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn().mockReturnValue(true)
}));

class TestReplyBot extends ReplyBot {
	public get defaultBotName(): string {
		return 'TestBot';
	}

	public get botIdentity(): { botName: string; avatarUrl: string } {
		return {
			botName: 'TestBot',
			avatarUrl: 'https://example.com/avatar.png'
		};
	}

	protected async processMessage(message: Message): Promise<void> {
		if (this.shouldReply(message)) {
			await this.sendReply(message.channel as any, this.getReply());
		}
	}

	public shouldReply(message: Message): boolean {
		return message.content.includes('test');
	}

	protected getReply(): string {
		return 'Test reply';
	}
}

describe('ReplyBot', () => {
	let bot: TestReplyBot;
	let message: Message;

	beforeEach(() => {
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
		bot = new TestReplyBot();
		message = mockMessage();
	});

	it('should send a reply when message contains "test"', async () => {
		message.content = 'test message';
		await bot.auditMessage(message);
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not send a reply when message does not contain "test"', async () => {
		message.content = 'no match';
		await bot.auditMessage(message);
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not send a reply when message is from a bot', async () => {
		message.content = 'test message';
		message.author.bot = true;
		await bot.auditMessage(message);
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	describe('response rate', () => {
		it('should use default response rate of 100%', () => {
			expect(bot['responseRate']).toBe(100);
		});

		it('should respect custom response rate', () => {
			bot['responseRate'] = 50;
			expect(bot['responseRate']).toBe(50);
		});

		it('should call percentChance with correct rate', () => {
			bot['responseRate'] = 75;
			bot['shouldTriggerResponse']();
			expect(percentChance).toHaveBeenCalledWith(75);
		});

		it('should return true when percentChance returns true', () => {
			(percentChance as jest.Mock).mockReturnValueOnce(true);
			expect(bot['shouldTriggerResponse']()).toBe(true);
		});

		it('should return false when percentChance returns false', () => {
			(percentChance as jest.Mock).mockReturnValueOnce(false);
			expect(bot['shouldTriggerResponse']()).toBe(false);
		});
	});

	describe('bot identity validation', () => {
		// Create a class with invalid botIdentity to test validation
		class BrokenBotIdentity extends ReplyBot {
			public get defaultBotName(): string {
				return 'BrokenBot';
			}

			public get botIdentity() {
				return {
					botName: '',  // Empty bot name
					avatarUrl: '' // Empty avatar URL
				};
			}

			protected async processMessage(message: Message): Promise<void> {
				await this.sendReply(message.channel as any, 'Test reply');
			}
		}

		it('should use fallback identity when bot identity is invalid', async () => {
			const brokenBot = new BrokenBotIdentity();
			message.content = 'test message';
			await brokenBot.handleMessage(message);

			// Check that webhookService was called with fallback values
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					content: 'Test reply'
				})
			);

			// Verify that the fallback values were used
			const callArgs = mockWebhookService.writeMessage.mock.calls[0][1];
			expect(callArgs.botName || callArgs.username).toBe('BrokenBot');
			expect(callArgs.avatarUrl || callArgs.avatarURL).toContain('http');
		});

		it('should use valid bot identity when all fields are valid', async () => {
			message.content = 'test message';
			await bot.handleMessage(message);

			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					botName: 'TestBot',
					avatarUrl: 'https://example.com/avatar.png',
					content: 'Test reply'
				})
			);
		});
	});
});
