// Import necessary modules
import { createMockMessage } from "@/tests/mocks/discordMocks";
import { createMockWebhookService } from "@/tests/mocks/serviceMocks";
import { Message } from "discord.js";
import guyBot from "./guyBot";
import { BOT_NAME, GUY_BOT_AVATAR_URL, RANDOM_RESPONSE_CHANCE_PERCENT, TEST } from "./guyBotModel";

// Mock the OneCondition module directly
jest.mock('@/starbunk/bots/triggers/conditions/oneCondition', () => ({
	OneCondition: jest.fn().mockImplementation(() => ({
		shouldTrigger: jest.fn()
	}))
}));

describe('GuyBot', () => {
	// Test fixtures
	let mockOneConditionInstance: { shouldTrigger: jest.Mock };
	let mockWebhookService: ReturnType<typeof createMockWebhookService>;
	let botInstance: ReturnType<typeof guyBot>;
	let mockMessage: ReturnType<typeof createMockMessage>;

	beforeEach(() => {
		// Arrange - Common setup for all tests
		jest.clearAllMocks();

		// Create a fresh mock instance
		mockOneConditionInstance = { shouldTrigger: jest.fn() };

		// Update the mock implementation
		const OneConditionMock = jest.requireMock('@/starbunk/bots/triggers/conditions/oneCondition').OneCondition;
		OneConditionMock.mockImplementation(() => mockOneConditionInstance);

		// Create common test fixtures
		mockWebhookService = createMockWebhookService();
		mockMessage = createMockMessage(TEST.USER_NAME);
		botInstance = guyBot(mockWebhookService);
	});

	it('should respond to messages containing "guy"', async () => {
		// Arrange
		mockMessage.content = TEST.MESSAGE.WITH_GUY;
		mockOneConditionInstance.shouldTrigger.mockResolvedValue(TEST.CONDITIONS.TRIGGER);

		// Act
		await botInstance.handleMessage(mockMessage as Message<boolean>);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			mockMessage.channel,
			expect.objectContaining({
				username: BOT_NAME,
				avatarURL: GUY_BOT_AVATAR_URL,
			})
		);
	});

	it(`should respond to random messages with a ${RANDOM_RESPONSE_CHANCE_PERCENT}% chance`, async () => {
		// Arrange
		mockMessage.content = TEST.MESSAGE.WITHOUT_GUY;
		mockOneConditionInstance.shouldTrigger.mockResolvedValue(TEST.CONDITIONS.TRIGGER);

		// Act
		await botInstance.handleMessage(mockMessage as Message<boolean>);

		// Assert
		expect(mockWebhookService.writeMessage).toHaveBeenCalledWith(
			mockMessage.channel,
			expect.objectContaining({
				username: BOT_NAME,
				avatarURL: GUY_BOT_AVATAR_URL,
			})
		);
	});

	it(`should NOT respond to random messages when outside the ${RANDOM_RESPONSE_CHANCE_PERCENT}% chance`, async () => {
		// Arrange
		mockMessage.content = TEST.MESSAGE.WITHOUT_GUY;
		mockOneConditionInstance.shouldTrigger.mockResolvedValue(TEST.CONDITIONS.NO_TRIGGER);

		// Act
		await botInstance.handleMessage(mockMessage as Message<boolean>);

		// Assert
		expect(mockWebhookService.writeMessage).not.toHaveBeenCalled();
	});
});
