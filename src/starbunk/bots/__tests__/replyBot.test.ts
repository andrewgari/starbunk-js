import { Message } from 'discord.js';
import { container, ServiceId } from '../../../services/services';
import ReplyBot from '../replyBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

class TestReplyBot extends ReplyBot {
	public get botIdentity(): { userId: string; botName: string; avatarUrl: string } {
		return {
			userId: '',
			botName: 'TestBot',
			avatarUrl: 'https://example.com/avatar.png'
		};
	}

	public shouldReply(message: Message): boolean {
		return message.content.includes('test');
	}

	protected getReply(): string {
		return 'Test reply';
	}

	public async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		if (this.shouldReply(message)) {
			await this.sendReply(message.channel as any, this.getReply());
		}
	}
}

describe('ReplyBot', () => {
	let replyBot: TestReplyBot;

	beforeEach(() => {
		// Clear container and register mocks
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);

		// Create ReplyBot instance
		replyBot = new TestReplyBot();
	});

	it('should respond to messages matching shouldReply', async () => {
		const message = mockMessage('this is a test message');
		await replyBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				content: 'Test reply',
				username: 'TestBot',
				avatarURL: 'https://example.com/avatar.png'
			})
		);
	});

	it('should not respond to bot messages', async () => {
		const message = mockMessage('test');
		message.author.bot = true;
		await replyBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not respond to messages not matching shouldReply', async () => {
		const message = mockMessage('hello world');
		await replyBot.handleMessage(message);

		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
