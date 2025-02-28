import { Message } from 'discord.js';
import { OpenAI } from 'openai';
import { BlueAICondition } from '../../../../../starbunk/bots/triggers/conditions/blueAICondition';

// Mock the OpenAI client
jest.mock('openai', () => {
	return {
		OpenAI: jest.fn().mockImplementation(() => {
			return {
				chat: {
					completions: {
						create: jest.fn(),
					},
				},
			};
		}),
	};
});

describe('BlueAICondition Non-Latin Script Testing', () => {
	let mockOpenAI: jest.Mocked<OpenAI>;
	let condition: BlueAICondition;
	let mockMessage: Message;

	beforeEach(() => {
		// Clear all mocks
		jest.clearAllMocks();

		// Create a mock OpenAI client
		mockOpenAI = new OpenAI() as jest.Mocked<OpenAI>;

		// Create the condition with the mock client
		condition = new BlueAICondition(mockOpenAI);

		// Create a mock message
		mockMessage = {
			content: '',
		} as Message;
	});

	describe('Without API Key', () => {
		it('should return false for non-Latin scripts when OPENAI_KEY is not set', async () => {
			// Ensure OPENAI_KEY is not set
			delete process.env.OPENAI_KEY;

			const nonLatinScripts = [
				'синий', // Russian
				'青',    // Chinese/Japanese
				'ブルー', // Japanese
				'블루',  // Korean
				'כחול',  // Hebrew
				'नीला',  // Hindi
				'蓝'     // Simplified Chinese
			];

			for (const script of nonLatinScripts) {
				mockMessage.content = script;
				const result = await condition.shouldTrigger(mockMessage);

				// Without an API key, all results should be false regardless of content
				expect(result).toBe(false);
			}
		});
	});

	describe('With API Key', () => {
		it('should pass non-Latin scripts to the OpenAI API when OPENAI_KEY is set', async () => {
			// Set mock API key
			process.env.OPENAI_KEY = 'test-key';

			// Mock OpenAI response
			(mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
				choices: [
					{
						message: {
							content: 'yes'
						}
					}
				]
			});

			const nonLatinScripts = [
				'синий', // Russian
				'青',    // Chinese/Japanese
				'ブルー', // Japanese
				'블루',  // Korean
				'כחול',  // Hebrew
				'नीला',  // Hindi
				'蓝'     // Simplified Chinese
			];

			for (const script of nonLatinScripts) {
				// Reset the mock for each test
				(mockOpenAI.chat.completions.create as jest.Mock).mockClear();

				mockMessage.content = script;
				const result = await condition.shouldTrigger(mockMessage);

				// Verify the API was called with the correct content
				expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
				expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
					expect.objectContaining({
						messages: expect.arrayContaining([
							expect.objectContaining({
								role: 'user',
								content: expect.stringContaining(script)
							})
						])
					})
				);

				// With the mocked "yes" response, all results should be true
				expect(result).toBe(true);
			}

			// Clean up
			delete process.env.OPENAI_KEY;
		});
	});
});
