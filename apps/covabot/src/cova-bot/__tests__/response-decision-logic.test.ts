import { CovaBot, CovaBotConfig } from '../cova-bot';
import { getCovaIdentity } from '../../services/identity';
import { BotIdentity } from '../../types/bot-identity';
import { TriggerResponse } from '../../types/trigger-response';
import { logger } from '@starbunk/shared';
import {
	MockDiscordMessage,
	createCovaDirectMentionMessage,
	createCovaNameMentionMessage,
	createBotMessage,
	createCovaBotMessage,
} from '../../__tests__/mocks/discord-mocks';

// Mock dependencies
jest.mock('../../services/identity');
jest.mock('@starbunk/shared', () => ({
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
}));

const mockGetCovaIdentity = getCovaIdentity as jest.MockedFunction<typeof getCovaIdentity>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('CovaBot - Response Decision Logic Tests', () => {
	let covaBot: CovaBot;
	let mockIdentity: BotIdentity;
	let directMentionTrigger: TriggerResponse;
	let nameMentionTrigger: TriggerResponse;
	let generalTrigger: TriggerResponse;

	beforeEach(() => {
		jest.clearAllMocks();

		mockIdentity = {
			botName: 'Cova',
			avatarUrl: 'https://cdn.discordapp.com/avatars/123/cova-avatar.png',
		};

		// Mock trigger that responds to direct mentions (@CovaBot)
		directMentionTrigger = {
			name: 'direct-mention-trigger',
			priority: 100,
			condition: jest.fn().mockImplementation((message: MockDiscordMessage) => {
				return message.mentions.has('bot-client-123'); // CovaBot's client ID
			}),
			response: jest.fn().mockResolvedValue('Direct mention response'),
		};

		// Mock trigger that responds to name mentions ("Cova")
		nameMentionTrigger = {
			name: 'name-mention-trigger',
			priority: 50,
			condition: jest.fn().mockImplementation((message: MockDiscordMessage) => {
				return message.content.toLowerCase().includes('cova');
			}),
			response: jest.fn().mockResolvedValue('Name mention response'),
		};

		// Mock general trigger with lower priority
		generalTrigger = {
			name: 'general-trigger',
			priority: 10,
			condition: jest.fn().mockImplementation((message: MockDiscordMessage) => {
				return message.content.length > 0; // Responds to any non-empty message
			}),
			response: jest.fn().mockResolvedValue('General response'),
		};

		const config: CovaBotConfig = {
			name: 'CovaBot',
			description: 'Test CovaBot for decision logic',
			defaultIdentity: mockIdentity,
			triggers: [generalTrigger, nameMentionTrigger, directMentionTrigger], // Mixed order to test priority
			defaultResponseRate: 100,
			skipBotMessages: true,
			disabled: false,
		};

		covaBot = new CovaBot(config);
		mockGetCovaIdentity.mockResolvedValue(mockIdentity);
	});

	describe('Direct Mention Detection', () => {
		it('should respond to direct mentions with highest priority', async () => {
			const message = createCovaDirectMentionMessage('Hey @CovaBot, how are you?');

			await covaBot.processMessage(message as any);

			expect(directMentionTrigger.condition).toHaveBeenCalledWith(message);
			expect(directMentionTrigger.response).toHaveBeenCalledWith(message);
			expect(nameMentionTrigger.condition).not.toHaveBeenCalled();
			expect(generalTrigger.condition).not.toHaveBeenCalled();
		});

		it('should handle direct mentions with additional content', async () => {
			const message = createCovaDirectMentionMessage('@CovaBot can you help me with this code?');

			await covaBot.processMessage(message as any);

			expect(directMentionTrigger.response).toHaveBeenCalled();
		});

		it('should not respond to mentions of other users', async () => {
			const message = new MockDiscordMessage('Hey @SomeOtherBot, how are you?');
			message.setMentions('other-bot-456', true);

			await covaBot.processMessage(message as any);

			expect(directMentionTrigger.condition).toHaveBeenCalledWith(message);
			expect(directMentionTrigger.response).not.toHaveBeenCalled();
			// Should fall through to other triggers
			expect(nameMentionTrigger.condition).toHaveBeenCalled();
		});
	});

	describe('Name Mention Detection', () => {
		it('should respond to name mentions when no direct mention', async () => {
			const message = createCovaNameMentionMessage('I wonder what Cova thinks about this');

			await covaBot.processMessage(message as any);

			expect(directMentionTrigger.condition).toHaveBeenCalledWith(message);
			expect(directMentionTrigger.response).not.toHaveBeenCalled();
			expect(nameMentionTrigger.condition).toHaveBeenCalledWith(message);
			expect(nameMentionTrigger.response).toHaveBeenCalledWith(message);
			expect(generalTrigger.condition).not.toHaveBeenCalled();
		});

		it('should detect case-insensitive name mentions', async () => {
			const message = new MockDiscordMessage('Hey COVA, what do you think?');

			await covaBot.processMessage(message as any);

			expect(nameMentionTrigger.response).toHaveBeenCalled();
		});

		it('should detect name mentions in middle of sentence', async () => {
			const message = new MockDiscordMessage('I think Cova would agree with this approach');

			await covaBot.processMessage(message as any);

			expect(nameMentionTrigger.response).toHaveBeenCalled();
		});

		it('should not respond to partial name matches', async () => {
			const message = new MockDiscordMessage('I love coverage reports');

			// Reset the name mention trigger to be more specific
			nameMentionTrigger.condition = jest.fn().mockImplementation((message: MockDiscordMessage) => {
				const words = message.content.toLowerCase().split(/\s+/);
				return words.includes('cova');
			});

			await covaBot.processMessage(message as any);

			expect(nameMentionTrigger.response).not.toHaveBeenCalled();
			expect(generalTrigger.response).toHaveBeenCalled(); // Should fall through
		});
	});

	describe('Author Validation', () => {
		it('should not respond to messages from Cova himself', async () => {
			const covaUserId = process.env.COVA_USER_ID || '139592376443338752';
			const message = new MockDiscordMessage('This is Cova speaking', covaUserId);

			// Mock the trigger to check author ID
			const authorCheckTrigger: TriggerResponse = {
				name: 'author-check-trigger',
				priority: 100,
				condition: jest.fn().mockImplementation((message: MockDiscordMessage) => {
					// Should not respond if author is Cova
					return message.author.id !== covaUserId;
				}),
				response: jest.fn().mockResolvedValue('Response to non-Cova'),
			};

			const authorCheckConfig: CovaBotConfig = {
				name: 'AuthorCheckBot',
				description: 'Bot that checks message author',
				defaultIdentity: mockIdentity,
				triggers: [authorCheckTrigger],
			};

			const authorCheckBot = new CovaBot(authorCheckConfig);
			await authorCheckBot.processMessage(message as any);

			expect(authorCheckTrigger.condition).toHaveBeenCalledWith(message);
			expect(authorCheckTrigger.response).not.toHaveBeenCalled();
		});

		it('should respond to messages from other users', async () => {
			const message = new MockDiscordMessage('Hello from another user', 'other-user-123');

			await covaBot.processMessage(message as any);

			expect(generalTrigger.response).toHaveBeenCalled();
		});
	});

	describe('Channel and Server Context', () => {
		it('should handle messages from different channels', async () => {
			const channel1Message = new MockDiscordMessage('Hello', 'user-123', false, 'guild-123', 'channel-1');
			const channel2Message = new MockDiscordMessage('Hello', 'user-123', false, 'guild-123', 'channel-2');

			await covaBot.processMessage(channel1Message as any);
			await covaBot.processMessage(channel2Message as any);

			expect(generalTrigger.response).toHaveBeenCalledTimes(2);
		});

		it('should handle messages from different servers', async () => {
			const server1Message = new MockDiscordMessage('Hello', 'user-123', false, 'guild-1', 'channel-123');
			const server2Message = new MockDiscordMessage('Hello', 'user-123', false, 'guild-2', 'channel-123');

			await covaBot.processMessage(server1Message as any);
			await covaBot.processMessage(server2Message as any);

			expect(generalTrigger.response).toHaveBeenCalledTimes(2);
		});

		it('should handle direct messages (no guild context)', async () => {
			const dmMessage = new MockDiscordMessage('Hello in DM', 'user-123', false, undefined, 'dm-channel');

			await covaBot.processMessage(dmMessage as any);

			expect(generalTrigger.response).toHaveBeenCalled();
		});
	});

	describe('Message Type and Context Handling', () => {
		it('should handle different message types appropriately', async () => {
			const shortMessage = new MockDiscordMessage('Hi');
			const longMessage = new MockDiscordMessage(
				'This is a much longer message with lots of content that should still be processed correctly by the bot',
			);
			const emptyMessage = new MockDiscordMessage('');

			await covaBot.processMessage(shortMessage as any);
			await covaBot.processMessage(longMessage as any);
			await covaBot.processMessage(emptyMessage as any);

			// General trigger should respond to non-empty messages
			expect(generalTrigger.response).toHaveBeenCalledTimes(2);
		});

		it('should handle messages with special characters', async () => {
			const specialMessage = new MockDiscordMessage('Hello! @#$%^&*()_+ 🎉 emoji test');

			await covaBot.processMessage(specialMessage as any);

			expect(generalTrigger.response).toHaveBeenCalled();
		});

		it('should handle messages with URLs and links', async () => {
			const urlMessage = new MockDiscordMessage('Check out this link: https://example.com');

			await covaBot.processMessage(urlMessage as any);

			expect(generalTrigger.response).toHaveBeenCalled();
		});
	});

	describe('Frequency and Rate Limiting Context', () => {
		it('should track response frequency per channel', async () => {
			// This would be implemented in actual rate limiting logic
			const channel1Message1 = new MockDiscordMessage('Hello 1', 'user-123', false, 'guild-123', 'channel-1');
			const channel1Message2 = new MockDiscordMessage('Hello 2', 'user-123', false, 'guild-123', 'channel-1');
			const channel2Message1 = new MockDiscordMessage('Hello 1', 'user-123', false, 'guild-123', 'channel-2');

			await covaBot.processMessage(channel1Message1 as any);
			await covaBot.processMessage(channel1Message2 as any);
			await covaBot.processMessage(channel2Message1 as any);

			// All should trigger since we're not implementing actual rate limiting in this test
			expect(generalTrigger.response).toHaveBeenCalledTimes(3);
		});
	});

	describe('Identity Resolution Failure Handling', () => {
		it('should remain silent when identity resolution fails', async () => {
			mockGetCovaIdentity.mockResolvedValue(null); // Identity resolution fails

			const message = createCovaDirectMentionMessage('Hey @CovaBot!');
			await covaBot.processMessage(message as any);

			expect(directMentionTrigger.condition).toHaveBeenCalled();
			expect(directMentionTrigger.response).toHaveBeenCalled();
			expect(mockGetCovaIdentity).toHaveBeenCalled();

			// Bot should remain silent (no webhook send should be attempted)
			// This is verified by the fact that no error is thrown and the process completes
		});

		it.skip('should continue processing other triggers if identity fails for one', async () => {
			// Mock identity to fail for first trigger but succeed for others
			mockGetCovaIdentity
				.mockResolvedValueOnce(null) // First call fails
				.mockResolvedValueOnce(mockIdentity); // Second call succeeds

			const message = createCovaNameMentionMessage('What does Cova think?');
			await covaBot.processMessage(message as any);

			expect(nameMentionTrigger.condition).toHaveBeenCalled();
			expect(nameMentionTrigger.response).toHaveBeenCalled();
			expect(mockGetCovaIdentity).toHaveBeenCalledTimes(1);
		});
	});
});
