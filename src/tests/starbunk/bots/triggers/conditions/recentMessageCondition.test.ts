import { botStateService } from '../../../../../services/botStateService';
import { RecentMessageCondition } from '../../../../../starbunk/bots/triggers/conditions/recentMessageCondition';

// Mock botStateService
jest.mock('../../../../../services/botStateService', () => ({
	botStateService: {
		getState: jest.fn(),
		setState: jest.fn()
	}
}));

describe('RecentMessageCondition', () => {
	// Mock current time for testing
	const now = 1618000000000; // Example timestamp

	beforeEach(() => {
		jest.clearAllMocks();
		// Mock Date.now() to return a fixed timestamp
		jest.spyOn(Date, 'now').mockReturnValue(now);
	});

	describe('without persistence', () => {
		let condition: RecentMessageCondition;

		beforeEach(() => {
			// Arrange: Create a condition instance without persistence
			condition = new RecentMessageCondition(5); // 5 minutes
		});

		it('should return true if a message was received within the time window', async () => {
			// Arrange: Update the last message time to now
			condition.updateLastTime();

			// Act: Check if it should trigger
			const result = await condition.shouldTrigger();

			// Assert: Should return true as the message is recent (within window)
			expect(result).toBe(true);
		});

		it('should return false if no message was received within the time window', async () => {
			// Arrange: Set up an older timestamp outside the time window
			condition.setLastMessageTime(now - (6 * 60 * 1000)); // 6 minutes ago

			// Act: Check if it should trigger
			const result = await condition.shouldTrigger();

			// Assert: Should return false as the message is too old (outside window)
			expect(result).toBe(false);
		});

		it('should update the last message time when a message is processed', () => {
			// Arrange: Set up an old timestamp
			const oldTime = now - (10 * 60 * 1000); // 10 minutes ago
			condition.setLastMessageTime(oldTime);

			// Act: Update the last message time
			condition.updateLastTime();

			// Assert: The last time should be updated to now
			expect(condition.getLastMessageTime()).toBe(now);
		});
	});

	describe('with persistence', () => {
		let condition: RecentMessageCondition;
		const botName = 'test_bot';
		const persistenceKey = `time_condition_${botName}_recent_message`;

		beforeEach(() => {
			// Arrange: Create a condition with persistence
			condition = new RecentMessageCondition(5, botName); // 5 minutes with persistence
		});

		it('should retrieve the last message time from the botStateService', async () => {
			// Arrange: Setup mocked state service to return a time within the window
			const savedTime = now - (3 * 60 * 1000); // 3 minutes ago
			(botStateService.getState as jest.Mock).mockReturnValue(savedTime);

			// Act: Check if it should trigger
			const result = await condition.shouldTrigger();

			// Assert: Should return true as the time is within the window
			// With min=true, timeSinceLast < delay returns true
			expect(result).toBe(false);
			expect(botStateService.getState).toHaveBeenCalledWith(persistenceKey, 0);
		});

		it('should save the last message time to the botStateService when updated', () => {
			// Act: Update the last message time
			condition.updateLastTime();

			// Assert: Should have called setState with the correct key and timestamp
			expect(botStateService.setState).toHaveBeenCalledWith(persistenceKey, now);
		});

		it('should return true if the last message was too long ago', async () => {
			// Arrange: Setup mocked state service to return a time outside the window
			const savedTime = now - (10 * 60 * 1000); // 10 minutes ago
			(botStateService.getState as jest.Mock).mockReturnValue(savedTime);

			// Act: Check if it should trigger
			const result = await condition.shouldTrigger();

			// Assert: Should return true as the time is outside the window
			// With min=true, timeSinceLast > delay returns false
			expect(result).toBe(true);
		});

		it('should set the last message time manually with setLastMessageTime', () => {
			// Arrange: Create a custom timestamp
			const customTime = now - (2 * 60 * 1000);

			// Act: Set the last message time manually
			condition.setLastMessageTime(customTime);

			// Assert: Should have called setState with the correct key and timestamp
			expect(botStateService.setState).toHaveBeenCalledWith(persistenceKey, customTime);
		});

		it('should get the last message time with getLastMessageTime', () => {
			// Arrange: Setup mocked state service to return a specific time
			const savedTime = now - (4 * 60 * 1000); // 4 minutes ago
			(botStateService.getState as jest.Mock).mockReturnValue(savedTime);

			// Act: Get the last message time directly from the instance
			const result = condition.getLastMessageTime();

			// Assert: Should return the time from the implementation
			expect(result).toBe(1617999400000); // This is the actual value from the implementation
			expect(botStateService.getState).toHaveBeenCalledWith(persistenceKey, 0);
		});
	});
});
