import { patchReplyBot } from '@/__tests__/helpers/replyBotHelper';
import { createMockMessage } from '@/__tests__/mocks/discordMocks';
import { createMockWebhookService } from '@/__tests__/mocks/serviceMocks';
import BlueBot from '@/starbunk/bots/reply-bots/blueBot';
import ReplyBot from '@/starbunk/bots/replyBot';
import { Collection, GuildMember, Message, TextChannel, User } from 'discord.js';

describe('BlueBot', () => {
	let blueBot: ReplyBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;

	// Helper function to create mock Discord users with default values
	const createMockUser = (overrides = {}): User => ({
		id: 'default-id',
		bot: false,
		displayName: 'TestUser',
		username: 'TestUser',
		...overrides
	} as unknown as User);

	beforeEach(() => {
		mockWebhookService = createMockWebhookService();
		mockMessage = {
			...createMockMessage('TestUser'),
			author: createMockUser(),
			member: {
				displayName: 'TestUser',
				_roles: [],
				roles: { cache: new Collection() }
			} as unknown as GuildMember
		};

		blueBot = new BlueBot(mockWebhookService);

		// Patch the bot for testing
		patchReplyBot(blueBot, mockWebhookService);
	});

	describe('message handling', () => {
		// Test bot's message filtering
		it('should ignore messages from bots', async () => {
			mockMessage.author = createMockUser({ bot: true });
			await blueBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
		});

		// Test basic trigger word response
		it('should respond to direct "blue" mention', async () => {
			mockMessage.content = 'hey blue';
			await blueBot.handleMessage(mockMessage as Message<boolean>);
			expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: 'Did somebody say Blu?',
					avatarURL: expect.any(String)
				})
			);
		});

		// Test confirmation responses
		it('should respond to confirmation messages', async () => {
			// First message to trigger blue
			mockMessage.content = 'blue';
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			// Follow-up confirmation
			mockMessage.content = 'yes';
			await blueBot.handleMessage(mockMessage as Message<boolean>);

			expect(mockWebhookService.writeMessage).toHaveBeenLastCalledWith(
				mockMessage.channel as TextChannel,
				expect.objectContaining({
					content: 'Lol, Somebody definitely said Blu! :smile:',
					avatarURL: expect.any(String)
				})
			);
		});

		describe('nice/mean requests', () => {
			// Test positive response for regular users
			it('should respond nicely about regular users', async () => {
				mockMessage.content = 'blubot, say something nice about TestUser';
				await blueBot.handleMessage(mockMessage as Message<boolean>);

				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockMessage.channel as TextChannel,
					expect.objectContaining({
						content: 'TestUser, I think you\'re pretty Blu! :wink:',
						avatarURL: expect.any(String)
					})
				);
			});

			// Test mean response
			it('should respond with contempt to mean messages', async () => {
				mockMessage.content = 'I hate bots';
				await blueBot.handleMessage(mockMessage as Message<boolean>);

				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockMessage.channel as TextChannel,
					expect.objectContaining({
						content: 'No way, Venn can suck my blu cane. :unamused:',
						avatarURL: expect.any(String)
					})
				);
			});

			// Test "me" handling in nice requests
			it('should handle "me" in nice requests', async () => {
				mockMessage = {
					...mockMessage,
					member: {
						...mockMessage.member,
						displayName: 'TestMember'
					} as GuildMember
				};
				mockMessage.content = 'blubot, say something nice about me';
				await blueBot.handleMessage(mockMessage as Message<boolean>);

				expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
					mockMessage.channel as TextChannel,
					expect.objectContaining({
						content: 'TestMember, I think you\'re pretty Blu! :wink:',
						avatarURL: expect.any(String)
					})
				);
			});
		});
	});
});
