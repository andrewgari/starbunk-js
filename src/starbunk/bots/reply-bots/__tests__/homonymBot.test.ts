import { Message, TextChannel, User } from 'discord.js';
import HomonymBot from '../homonymBot';

describe('HomonymBot', () => {
	let homonymBot: HomonymBot;
	let mockMessage: Partial<Message<boolean>>;
	let mockChannel: Partial<TextChannel>;
	let mockUser: Partial<User>;

	beforeEach(() => {
		// Arrange
		homonymBot = new HomonymBot();

		mockChannel = {
			send: jest.fn().mockResolvedValue(undefined)
		} as unknown as Partial<TextChannel>;

		// Create mock user with proper type casting
		const userMock = {
			bot: false,
			id: '123',
			// Add required User properties to satisfy TypeScript
			_equals: jest.fn(),
			accentColor: null,
			avatar: null,
			avatarDecoration: null,
			banner: null,
			bannerColor: null,
			createdAt: new Date(),
			createdTimestamp: Date.now(),
			discriminator: '0000',
			displayName: 'TestUser',
			dmChannel: null,
			flags: null,
			globalName: 'TestUser',
			hexAccentColor: null,
			partial: false,
			system: false,
			tag: 'TestUser#0000',
			username: 'TestUser'
		};
		mockUser = userMock as unknown as Partial<User>;

		// Create mock message with proper type casting
		const messageMock = {
			author: mockUser as unknown as User,
			content: '',
			channel: mockChannel as unknown as TextChannel
		};
		mockMessage = messageMock as unknown as Partial<Message<boolean>>;

		// Mock the sendReply method
		homonymBot.sendReply = jest.fn();
	});

	test('should not respond to bot messages', async () => {
		// Arrange
		mockUser.bot = true;
		mockMessage.author = mockUser as unknown as User;

		// Act
		await homonymBot.handleMessage(mockMessage as Message<boolean>);

		// Assert
		expect(homonymBot.sendReply).not.toHaveBeenCalled();
	});

	test.each([
		['their', 'there'],
		['there', 'their'],
		['they\'re', 'their'],
		['for', 'four'],
		['fore', 'for'],
		['four', 'fore']
	])('should correct "%s" to "%s"', async (word, correction) => {
		// Arrange
		mockMessage.content = `I think ${word} is the right word.`;

		// Act
		await homonymBot.handleMessage(mockMessage as Message<boolean>);

		// Assert
		expect(homonymBot.sendReply).toHaveBeenCalledWith(
			mockChannel as unknown as TextChannel,
			`*${correction}`
		);
	});

	test('should not respond to messages without target words', async () => {
		// Arrange
		mockMessage.content = 'This message has no target homonyms.';

		// Act
		await homonymBot.handleMessage(mockMessage as Message<boolean>);

		// Assert
		expect(homonymBot.sendReply).not.toHaveBeenCalled();
	});

	test('should only match whole words', async () => {
		// Arrange
		mockMessage.content = 'Therefore is not a target word.';

		// Act
		await homonymBot.handleMessage(mockMessage as Message<boolean>);

		// Assert
		expect(homonymBot.sendReply).not.toHaveBeenCalled();
	});

	test('should be case insensitive', async () => {
		// Arrange
		mockMessage.content = 'THEIR is still detected regardless of case.';

		// Act
		await homonymBot.handleMessage(mockMessage as Message<boolean>);

		// Assert
		expect(homonymBot.sendReply).toHaveBeenCalledWith(
			mockChannel as unknown as TextChannel,
			'*there'
		);
	});
});
