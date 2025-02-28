import { Message } from 'discord.js';
import { OpenAI } from 'openai';
import { BlueAICondition } from '../../../../../starbunk/bots/triggers/conditions/blueAICondition';

// Mock the OpenAI client
jest.mock('openai', () => {
	return {
		OpenAI: jest.fn().mockImplementation(() => ({
			chat: {
				completions: {
					create: jest.fn()
				}
			}
		}))
	};
});

describe('BlueAICondition Unicode Testing', () => {
	let blueAICondition: BlueAICondition;
	let mockOpenAI: jest.Mocked<OpenAI>;
	let mockMessage: Partial<Message>;

	beforeEach(() => {
		// Create a mock OpenAI client
		mockOpenAI = new OpenAI() as jest.Mocked<OpenAI>;
		mockOpenAI.chat.completions.create = jest.fn();

		// Create the condition with the mock client
		blueAICondition = new BlueAICondition(mockOpenAI);

		// Create a mock message
		mockMessage = {
			content: 'test message'
		} as Partial<Message>;

		// Ensure we have a mock API key for these tests
		process.env.OPENAI_KEY = 'test-key';
	});

	afterEach(() => {
		// Clean up
		delete process.env.OPENAI_KEY;
		jest.clearAllMocks();
	});

	describe('Non-Latin Character Handling', () => {
		it('should pass Unicode characters correctly to the OpenAI API', async () => {
			// Mock the OpenAI response to return "yes"
			(mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
				choices: [
					{
						message: {
							content: 'yes'
						}
					}
				]
			});

			// Test various unicode representations of blue
			const unicodeBlueTerms = [
				'синий', // Russian
				'青',    // Chinese/Japanese
				'ブルー', // Japanese
				'블루',  // Korean
				'כחול',  // Hebrew
				'नीला',  // Hindi
				'蓝'     // Simplified Chinese
			];

			for (const term of unicodeBlueTerms) {
				// Reset the mock for each test
				(mockOpenAI.chat.completions.create as jest.Mock).mockClear();

				// Set the message content to the current term
				mockMessage.content = term;

				// Call the method
				const result = await (blueAICondition as unknown as {
					checkIfBlueIsSaid(message: Message): Promise<boolean>;
				}).checkIfBlueIsSaid(mockMessage as Message);

				// Verify the API was called with the correct message content
				expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
				expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
					expect.objectContaining({
						messages: expect.arrayContaining([
							expect.objectContaining({
								role: 'user',
								content: expect.stringContaining(term)
							})
						])
					})
				);

				// Verify the result is correct
				expect(result).toBe(true);
			}
		});

		it('should handle Unicode characters in longer messages', async () => {
			// Mock the OpenAI response to return "yes"
			(mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
				choices: [
					{
						message: {
							content: 'yes'
						}
					}
				]
			});

			// Test a longer message with Unicode
			const message = 'I really like the color 青 (blue in Chinese/Japanese)';
			mockMessage.content = message;

			// Call the method
			const result = await (blueAICondition as unknown as {
				checkIfBlueIsSaid(message: Message): Promise<boolean>;
			}).checkIfBlueIsSaid(mockMessage as Message);

			// Verify the API was called with the correct message content
			expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
			expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					messages: expect.arrayContaining([
						expect.objectContaining({
							role: 'user',
							content: expect.stringContaining(message)
						})
					])
				})
			);

			// Verify the result is correct
			expect(result).toBe(true);
		});
	});
});
