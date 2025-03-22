import { Message } from 'discord.js';
import { container, ServiceId } from '../../../services/services';
import ReplyBot from '../replyBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

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
	let message: Message;

	beforeEach(() => {
		container.register(ServiceId.Logger, { useValue: mockLogger });
		container.register(ServiceId.WebhookService, { useValue: mockWebhookService });
		replyBot = new TestReplyBot();
		message = mockMessage();
	});

	it('should send a reply when message contains "test"', async () => {
		message.content = 'test message';
		await replyBot.auditMessage(message);
		expect(mockWebhookService.writeMessage).toHaveBeenCalled();
	});

	it('should not send a reply when message does not contain "test"', async () => {
		message.content = 'no match';
		await replyBot.auditMessage(message);
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});

	it('should not send a reply for bot messages', async () => {
		message.content = 'test message';
		message.author.bot = true;
		await replyBot.auditMessage(message);
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
