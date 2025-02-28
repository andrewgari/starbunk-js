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

describe('BlueAICondition', () => {
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

		// Save the original environment variable
		process.env.OPENAI_KEY_ORIGINAL = process.env.OPENAI_KEY;
	});

	afterEach(() => {
		// Restore the original environment variable
		process.env.OPENAI_KEY = process.env.OPENAI_KEY_ORIGINAL;
		delete process.env.OPENAI_KEY_ORIGINAL;

		jest.clearAllMocks();
	});

	describe('shouldTrigger', () => {
		it('should call checkIfBlueIsSaid', async () => {
			// Spy on the protected method
			const spy = jest.spyOn(blueAICondition as unknown as { checkIfBlueIsSaid(message: Message): Promise<boolean> }, 'checkIfBlueIsSaid');

			await blueAICondition.shouldTrigger(mockMessage as Message);

			expect(spy).toHaveBeenCalledWith(mockMessage);
		});
	});

	describe('checkIfBlueIsSaid', () => {
		it('should return false when OPENAI_KEY is not set', async () => {
			// Ensure OPENAI_KEY is not set
			delete process.env.OPENAI_KEY;

			// Test with any message
			mockMessage.content = 'I like blue';

			const result = await (blueAICondition as unknown as { checkIfBlueIsSaid(message: Message): Promise<boolean> }).checkIfBlueIsSaid(mockMessage as Message);

			expect(result).toBe(false);
			expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
		});

		it('should use OpenAI API when OPENAI_KEY is set and return true for "yes" response', async () => {
			// Set OPENAI_KEY
			process.env.OPENAI_KEY = 'test-key';

			// Mock the OpenAI response
			(mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
				choices: [
					{
						message: {
							content: 'yes'
						}
					}
				]
			});

			const result = await (blueAICondition as unknown as { checkIfBlueIsSaid(message: Message): Promise<boolean> }).checkIfBlueIsSaid(mockMessage as Message);

			expect(result).toBe(true);
			expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
		});

		it('should use OpenAI API when OPENAI_KEY is set and return false for "no" response', async () => {
			// Set OPENAI_KEY
			process.env.OPENAI_KEY = 'test-key';

			// Mock the OpenAI response
			(mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
				choices: [
					{
						message: {
							content: 'no'
						}
					}
				]
			});

			const result = await (blueAICondition as unknown as { checkIfBlueIsSaid(message: Message): Promise<boolean> }).checkIfBlueIsSaid(mockMessage as Message);

			expect(result).toBe(false);
			expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
		});

		it('should return false when OpenAI API throws an error', async () => {
			// Set OPENAI_KEY
			process.env.OPENAI_KEY = 'test-key';

			// Mock the OpenAI API to throw an error
			(mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValue(new Error('API error'));

			// Test with any message
			mockMessage.content = 'I like blue';

			const result = await (blueAICondition as unknown as { checkIfBlueIsSaid(message: Message): Promise<boolean> }).checkIfBlueIsSaid(mockMessage as Message);

			expect(result).toBe(false);
			expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
		});

		// Test various blue color terms with the OpenAI API
		it('should detect blue terms via OpenAI API', async () => {
			// Set OPENAI_KEY
			process.env.OPENAI_KEY = 'test-key';

			// Mock the OpenAI response to return "yes" for blue terms
			(mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue({
				choices: [
					{
						message: {
							content: 'yes'
						}
					}
				]
			});

			// Test a variety of blue terms
			const blueTerms = [
				'blu',
				'blue',
				'bloo',
				'azul',
				'blau',
				'bluu',
				'blew',
				'blö',
				'синий',
				'青',
				'ブルー',
				'블루',
				'כחול',
				'नीला',
				'蓝'
			];

			for (const term of blueTerms) {
				mockMessage.content = `I like ${term} color`;

				const result = await (blueAICondition as unknown as {
					checkIfBlueIsSaid(message: Message): Promise<boolean>;
				}).checkIfBlueIsSaid(mockMessage as Message);

				expect(result).toBe(true);
				expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();

				// Clear mock for next iteration
				(mockOpenAI.chat.completions.create as jest.Mock).mockClear();
			}
		});
	});
});
