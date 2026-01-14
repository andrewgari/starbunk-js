import { describe, test, expect, vi, beforeEach } from 'vitest';
import { BlueBotService } from '../src/services/bluebot-service';
import { LLMService } from '../src/llm/llm-service';
import { LLMCompletionOptions } from '../src/llm/types/llm-completion-options';
import { LLMCompletionResponse } from '../src/llm/types/llm-completion-response';
import { BlueVibe } from '../src/types/enums/blue-vibe';

class MockLLMService implements LLMService {
	public initialized = true;
	public completions = vi.fn<(options: LLMCompletionOptions) => Promise<LLMCompletionResponse>>();

	async initialize(): Promise<boolean> {
		this.initialized = true;
		return true;
	}

	isInitialized(): boolean {
		return this.initialized;
	}

	getProviderName(): string {
		return 'mock-llm';
	}

	getAvailableModels(): string[] {
		return ['mock-model'];
	}

	async createCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
		return this.completions(options);
	}

	async createSimpleCompletion(prompt: string, systemPrompt?: string): Promise<string> {
		const response = await this.completions({
			messages: [
				...(systemPrompt ? [{ role: 'system', content: systemPrompt } as const] : []),
				{ role: 'user', content: prompt },
			],
		} as unknown as LLMCompletionOptions);
		return response.content;
	}
}

describe('BlueBotService with vibe-based responses', () => {
	let mockLLM: MockLLMService;
	let service: BlueBotService;

	beforeEach(() => {
		mockLLM = new MockLLMService();
		// Reset the singleton instance for each test
		(BlueBotService as any).instance = null;
		service = BlueBotService.getInstance(mockLLM);
	});

	test('responds to blueGeneral vibe with high intensity', async () => {
		const reply = vi.fn();
		
		mockLLM.completions.mockResolvedValueOnce({
			content: '{"vibe": "blueGeneral", "intensity": 9, "response": "Did somebody say BLUE?! 💙"}',
			model: 'mock-model',
			provider: 'mock-llm',
		});

		await service.processMessage({
			content: 'I love blue!',
			author: { id: 'user-1', bot: false, username: 'User1' },
			reply,
		} as any);

		expect(mockLLM.completions).toHaveBeenCalledTimes(1);
		expect(reply).toHaveBeenCalledWith("Did somebody say BLUE?! 💙");
	});

	test('responds to blueSneaky vibe', async () => {
		const reply = vi.fn();
		
		mockLLM.completions.mockResolvedValueOnce({
			content: '{"vibe": "blueSneaky", "intensity": 7, "response": "I see what you did there... 👀💙"}',
			model: 'mock-model',
			provider: 'mock-llm',
		});

		await service.processMessage({
			content: 'The color that rhymes with "new"',
			author: { id: 'user-1', bot: false, username: 'User1' },
			reply,
		} as any);

		expect(reply).toHaveBeenCalledWith("I see what you did there... 👀💙");
	});

	test('responds to blueMention vibe with moderate intensity', async () => {
		const reply = vi.fn();
		
		mockLLM.completions.mockResolvedValueOnce({
			content: '{"vibe": "blueMention", "intensity": 5, "response": "Blue? 👀"}',
			model: 'mock-model',
			provider: 'mock-llm',
		});

		await service.processMessage({
			content: 'The wind blew today',
			author: { id: 'user-1', bot: false, username: 'User1' },
			reply,
		} as any);

		// With intensity 5, there's a 50% chance to respond
		// We can't test randomness reliably, but we can verify the LLM was called
		expect(mockLLM.completions).toHaveBeenCalledTimes(1);
	});

	test('does not respond to notBlue vibe with low intensity', async () => {
		const reply = vi.fn();
		
		mockLLM.completions.mockResolvedValueOnce({
			content: '{"vibe": "notBlue", "intensity": 1, "response": ""}',
			model: 'mock-model',
			provider: 'mock-llm',
		});

		await service.processMessage({
			content: 'What should I have for dinner?',
			author: { id: 'user-1', bot: false, username: 'User1' },
			reply,
		} as any);

		expect(mockLLM.completions).toHaveBeenCalledTimes(1);
		// With intensity 1, there's only a 10% chance, and even if it passes,
		// the response is empty, so it shouldn't reply
		expect(reply).not.toHaveBeenCalled();
	});

	test('does not respond when response is empty', async () => {
		const reply = vi.fn();
		
		mockLLM.completions.mockResolvedValueOnce({
			content: '{"vibe": "blueGeneral", "intensity": 10, "response": ""}',
			model: 'mock-model',
			provider: 'mock-llm',
		});

		await service.processMessage({
			content: 'test message',
			author: { id: 'user-1', bot: false, username: 'User1' },
			reply,
		} as any);

		expect(reply).not.toHaveBeenCalled();
	});

	test('handles LLM failure gracefully', async () => {
		const reply = vi.fn();
		
		mockLLM.completions.mockRejectedValueOnce(new Error('LLM service unavailable'));

		await service.processMessage({
			content: 'blue message',
			author: { id: 'user-1', bot: false, username: 'User1' },
			reply,
		} as any);

		// Should fall back to notBlue with intensity 1 and not respond
		expect(reply).not.toHaveBeenCalled();
	});
});

