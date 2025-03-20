import '@testing-library/jest-dom';
import { createDiscordMock } from './discordMock';

// Global mock for Discord-related functionality
export const discordMock = createDiscordMock();

// Re-export the mock services setup function
export { setupMockServices } from './mockServices';

// Set up the test environment before each test
beforeEach(() => {
	// Reset the discord mock before each test
	discordMock.reset();
});

// Clean up after each test
afterEach(() => {
	jest.clearAllMocks();
});

// Helper function for asserting bot responses
export function expectBotResponse(content: string, username?: string): void {
	const matchingMessage = discordMock.sentMessages.find(msg =>
		msg.content.includes(content) &&
		(username ? msg.username === username : true)
	);

	expect(matchingMessage).toBeTruthy();
}
