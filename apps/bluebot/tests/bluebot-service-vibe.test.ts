import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { BlueBotService } from '../src/services/bluebot-service';
import { LLMService } from '../src/llm/llm-service';
import { LLMCompletionOptions } from '../src/llm/types/llm-completion-options';
import { LLMCompletionResponse } from '../src/llm/types/llm-completion-response';
import { BlueVibe } from '../src/types/enums/blue-vibe';
import { refreshEnemyCache } from '../src/utils/enemy-users';

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
		// Create a fresh instance for each test
		service = new BlueBotService(mockLLM);
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

describe('BlueBotService with enemy users', () => {
	let mockLLM: MockLLMService;
	let service: BlueBotService;
	const originalEnv = process.env.BLUEBOT_ENEMY_USER_IDS;

	beforeEach(() => {
		mockLLM = new MockLLMService();
		service = new BlueBotService(mockLLM);
	});

	afterEach(() => {
		// Restore original environment
		if (originalEnv !== undefined) {
			process.env.BLUEBOT_ENEMY_USER_IDS = originalEnv;
		} else {
			delete process.env.BLUEBOT_ENEMY_USER_IDS;
		}
		refreshEnemyCache();
	});

	test('uses enemy prompt for users on the naughty list', async () => {
		const enemyUserId = '999888777666555444';
		process.env.BLUEBOT_ENEMY_USER_IDS = enemyUserId;
		refreshEnemyCache();

		const reply = vi.fn();

		mockLLM.completions.mockResolvedValueOnce({
			content: '{"vibe": "blueGeneral", "intensity": 8, "response": "Oh, YOU again... talking about blue 🙄"}',
			model: 'mock-model',
			provider: 'mock-llm',
		});

		await service.processMessage({
			content: 'I love blue!',
			author: { id: enemyUserId, bot: false, username: 'Enemy' },
			reply,
		} as any);

		expect(mockLLM.completions).toHaveBeenCalledTimes(1);

		// Verify the system prompt contains enemy personality traits
		const callArgs = mockLLM.completions.mock.calls[0][0];
		const systemMessage = callArgs.messages.find((m: any) => m.role === 'system');
		expect(systemMessage).toBeDefined();
		expect(systemMessage.content.toLowerCase()).toContain('naughty list');
		expect(systemMessage.content.toLowerCase()).toContain('cold');
		expect(systemMessage.content.toLowerCase()).toContain('contemptuous');

		expect(reply).toHaveBeenCalledWith("Oh, YOU again... talking about blue 🙄");
	});

	test('uses friendly prompt for users not on the naughty list', async () => {
		const friendlyUserId = '111222333444555666';
		process.env.BLUEBOT_ENEMY_USER_IDS = '999888777666555444';
		refreshEnemyCache();

		const reply = vi.fn();

		mockLLM.completions.mockResolvedValueOnce({
			content: '{"vibe": "blueGeneral", "intensity": 9, "response": "Did somebody say BLUE?! 💙"}',
			model: 'mock-model',
			provider: 'mock-llm',
		});

		await service.processMessage({
			content: 'I love blue!',
			author: { id: friendlyUserId, bot: false, username: 'Friend' },
			reply,
		} as any);

		expect(mockLLM.completions).toHaveBeenCalledTimes(1);

		// Verify the system prompt contains friendly personality traits
		const callArgs = mockLLM.completions.mock.calls[0][0];
		const systemMessage = callArgs.messages.find((m: any) => m.role === 'system');
		expect(systemMessage).toBeDefined();
		expect(systemMessage.content.toLowerCase()).toContain('nice');
		expect(systemMessage.content.toLowerCase()).toContain('friendly');
		expect(systemMessage.content.toLowerCase()).toContain('excited');

		// Should NOT contain enemy traits
		expect(systemMessage.content.toLowerCase()).not.toContain('naughty list');

		expect(reply).toHaveBeenCalledWith("Did somebody say BLUE?! 💙");
	});

	test('handles multiple enemy users correctly', async () => {
		const enemy1 = '111111111111111111';
		const enemy2 = '222222222222222222';
		const friend = '333333333333333333';

		process.env.BLUEBOT_ENEMY_USER_IDS = `${enemy1},${enemy2}`;
		refreshEnemyCache();

		const reply = vi.fn();

		// Test enemy 1
		mockLLM.completions.mockResolvedValueOnce({
			content: '{"vibe": "blueGeneral", "intensity": 8, "response": "Blue is too good for you"}',
			model: 'mock-model',
			provider: 'mock-llm',
		});

		await service.processMessage({
			content: 'blue!',
			author: { id: enemy1, bot: false, username: 'Enemy1' },
			reply,
		} as any);

		let callArgs = mockLLM.completions.mock.calls[0][0];
		let systemMessage = callArgs.messages.find((m: any) => m.role === 'system');
		expect(systemMessage.content.toLowerCase()).toContain('naughty list');

		// Test enemy 2
		mockLLM.completions.mockResolvedValueOnce({
			content: '{"vibe": "blueGeneral", "intensity": 8, "response": "As if YOU understand blue"}',
			model: 'mock-model',
			provider: 'mock-llm',
		});

		await service.processMessage({
			content: 'blue!',
			author: { id: enemy2, bot: false, username: 'Enemy2' },
			reply,
		} as any);

		callArgs = mockLLM.completions.mock.calls[1][0];
		systemMessage = callArgs.messages.find((m: any) => m.role === 'system');
		expect(systemMessage.content.toLowerCase()).toContain('naughty list');

		// Test friend
		mockLLM.completions.mockResolvedValueOnce({
			content: '{"vibe": "blueGeneral", "intensity": 9, "response": "BLUE! 💙"}',
			model: 'mock-model',
			provider: 'mock-llm',
		});

		await service.processMessage({
			content: 'blue!',
			author: { id: friend, bot: false, username: 'Friend' },
			reply,
		} as any);

		callArgs = mockLLM.completions.mock.calls[2][0];
		systemMessage = callArgs.messages.find((m: any) => m.role === 'system');
		expect(systemMessage.content.toLowerCase()).not.toContain('naughty list');
		expect(systemMessage.content.toLowerCase()).toContain('friendly');
	});

	test('enemy receives contemptuous response for blueRequest', async () => {
		const enemyUserId = '999888777666555444';
		process.env.BLUEBOT_ENEMY_USER_IDS = enemyUserId;
		refreshEnemyCache();

		const reply = vi.fn();

		mockLLM.completions.mockResolvedValueOnce({
			content: '{"vibe": "blueRequest", "intensity": 9, "response": "As if I\'d do anything YOU ask 🙄"}',
			model: 'mock-model',
			provider: 'mock-llm',
		});

		await service.processMessage({
			content: 'BlueBot, say something nice about me!',
			author: { id: enemyUserId, bot: false, username: 'Enemy' },
			reply,
		} as any);

		expect(reply).toHaveBeenCalledWith("As if I'd do anything YOU ask 🙄");
	});
});

