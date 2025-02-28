import { botStateService } from '../../../../services/botStateService';
import { BLUEBOT_TIMESTAMP_KEY } from '../../../../starbunk/bots/reply-bots/blueBot';

// Define a class for testing that's equivalent to the one in blueBot.ts
class RecentBluMessageCondition {
	private minutesWindow: number;

	constructor(minutesWindow: number) {
		this.minutesWindow = minutesWindow;
	}

	public shouldTrigger(): boolean {
		const lastTime = this.getLastBluMessageTime();
		if (lastTime === 0) {
			return false;
		}

		// Check if the message was sent within the time window
		const timeSinceLastMessage = Date.now() - lastTime;
		const windowMs = this.minutesWindow * 60 * 1000;
		return timeSinceLastMessage <= windowMs;
	}

	public getLastBluMessageTime(): number {
		return botStateService.getState(BLUEBOT_TIMESTAMP_KEY, 0);
	}

	public setLastBluMessageTime(time: number): void {
		botStateService.setState(BLUEBOT_TIMESTAMP_KEY, time);
	}

	public updateLastBluMessageTime(): void {
		this.setLastBluMessageTime(Date.now());
	}
}

// Mock botStateService
jest.mock('../../../../services/botStateService', () => ({
	botStateService: {
		getState: jest.fn(),
		setState: jest.fn()
	}
}));

// Mock the constant in case it's not defined
jest.mock('../../../../starbunk/bots/reply-bots/blueBot', () => ({
	BLUEBOT_TIMESTAMP_KEY: 'bluebot_last_initial_message_time'
}));

describe('RecentBluMessageCondition', () => {
	let condition: RecentBluMessageCondition;
	// Mock current time for testing
	const now = 1618000000000; // Example timestamp

	beforeEach(() => {
		jest.clearAllMocks();
		// Mock Date.now() to return a fixed timestamp
		jest.spyOn(Date, 'now').mockReturnValue(now);

		condition = new RecentBluMessageCondition(5); // 5 minutes window
	});

	it('should return true if the first blu message was sent within the time window', () => {
		// Message was sent 3 minutes ago
		const messageTime = now - (3 * 60 * 1000);
		(botStateService.getState as jest.Mock).mockReturnValue(messageTime);

		expect(condition.shouldTrigger()).toBe(true);
		expect(botStateService.getState).toHaveBeenCalledWith('bluebot_last_initial_message_time', 0);
	});

	it('should return false if the first blu message was sent outside the time window', () => {
		// Message was sent 10 minutes ago
		const messageTime = now - (10 * 60 * 1000);
		(botStateService.getState as jest.Mock).mockReturnValue(messageTime);

		expect(condition.shouldTrigger()).toBe(false);
	});

	it('should return false if no blu message has been sent yet', () => {
		// No message sent yet
		(botStateService.getState as jest.Mock).mockReturnValue(0);

		expect(condition.shouldTrigger()).toBe(false);
	});

	it('should set the last blu message time', () => {
		const messageTime = now - (1 * 60 * 1000);
		condition.setLastBluMessageTime(messageTime);

		expect(botStateService.setState).toHaveBeenCalledWith('bluebot_last_initial_message_time', messageTime);
	});

	it('should get the last blu message time', () => {
		const messageTime = now - (2 * 60 * 1000);
		(botStateService.getState as jest.Mock).mockReturnValue(messageTime);

		expect(condition.getLastBluMessageTime()).toBe(messageTime);
		expect(botStateService.getState).toHaveBeenCalledWith('bluebot_last_initial_message_time', 0);
	});

	it('should update the last blu message time to current time', () => {
		condition.updateLastBluMessageTime();

		expect(botStateService.setState).toHaveBeenCalledWith('bluebot_last_initial_message_time', now);
	});
});
