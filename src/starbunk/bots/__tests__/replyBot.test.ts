import { Message, TextChannel } from 'discord.js';
import { container, ServiceId } from '../../../services/container';
import { percentChance } from '../../../utils/random';
import { DiscordService } from '../../../services/discordService';
import ReplyBot from '../replyBot';
import { mockLogger, mockMessage, mockWebhookService } from './testUtils';

// Mock Random module
jest.mock('../../../utils/random', () => ({
	percentChance: jest.fn().mockReturnValue(true)
}));

// Mock DiscordService
jest.mock('../../../services/discordService', () => ({
	DiscordService: {
		getInstance: jest.fn().mockReturnValue({
			sendMessageWithBotIdentity: jest.fn().mockResolvedValue(undefined)
		})
	}
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
			await this.sendReply(message.channel as TextChannel, this.getReply());
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
	let discordServiceMock: { sendMessageWithBotIdentity: jest.Mock };

	beforeEach(() => {
		// Arrange
		jest.clearAllMocks();
		container.clear();
		container.register(ServiceId.Logger, () => mockLogger);
		container.register(ServiceId.WebhookService, () => mockWebhookService);
		
		// Setup the discord service mock 
		discordServiceMock = DiscordService.getInstance() as unknown as { sendMessageWithBotIdentity: jest.Mock };
		
		bot = new TestReplyBot();
		message = mockMessage();
	});

	describe('message handling', () => {
		it('should send a reply when message contains "test"', async () => {
			// Arrange
			message.content = 'test message';
			
			// Act
			await bot.auditMessage(message);
			
			// Assert
			expect(discordServiceMock.sendMessageWithBotIdentity).toHaveBeenCalled();
		});

		it('should not send a reply when message does not contain "test"', async () => {
			// Arrange
			message.content = 'no match';
			
			// Act
			await bot.auditMessage(message);
			
			// Assert
			expect(discordServiceMock.sendMessageWithBotIdentity).not.toHaveBeenCalled();
		});

		it('should not send a reply when message is from a bot', async () => {
			// Arrange
			message.content = 'test message';
			message.author.bot = true;
			
			// Act
			await bot.auditMessage(message);
			
			// Assert
			expect(discordServiceMock.sendMessageWithBotIdentity).not.toHaveBeenCalled();
		});
	});

	describe('response rate', () => {
		it('should use default response rate of 100%', () => {
			// Assert
			expect(bot['responseRate']).toBe(100);
		});

		it('should respect custom response rate', () => {
			// Arrange
			bot['responseRate'] = 50;
			
			// Assert
			expect(bot['responseRate']).toBe(50);
		});

		it('should call percentChance with correct rate', () => {
			// Arrange
			bot['responseRate'] = 75;
			
			// Act
			bot['shouldTriggerResponse']();
			
			// Assert
			expect(percentChance).toHaveBeenCalledWith(75);
		});
	});

	describe('bot identity', () => {
		// Test class with invalid botIdentity
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
				await this.sendReply(message.channel as TextChannel, 'Test reply');
			}
		}

		it('should use valid bot identity when provided', async () => {
			// Arrange
			message.content = 'test message';
			
			// Act
			await bot.handleMessage(message);
			
			// Assert
			expect(discordServiceMock.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				{
					botName: 'TestBot',
					avatarUrl: 'https://example.com/avatar.png'
				},
				'Test reply'
			);
		});

		it('should pass empty identity when invalid identity is provided', async () => {
			// Arrange
			const brokenBot = new BrokenBotIdentity();
			message.content = 'test message';
			
			// Act
			await brokenBot.handleMessage(message);
			
			// Assert
			expect(discordServiceMock.sendMessageWithBotIdentity).toHaveBeenCalledWith(
				message.channel.id,
				{
					botName: '',
					avatarUrl: ''
				},
				'Test reply'
			);
		});
	});
});
