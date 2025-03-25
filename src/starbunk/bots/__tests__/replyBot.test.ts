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

	public get botIdentity(): { userId: string; botName: string; avatarUrl: string } {
		return {
			userId: '',
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
});
