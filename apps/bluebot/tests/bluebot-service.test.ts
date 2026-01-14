import { vi } from 'vitest';
import { LLMService } from '../src/llm/llm-service';
import { LLMCompletionOptions } from '../src/llm/types/llm-completion-options';
import { LLMCompletionResponse } from '../src/llm/types/llm-completion-response';

// Keep the test expectations aligned with BlueBotService's default response
// without depending on the deprecated constants module.
const BLUE_BOT_DEFAULT_RESPONSE = 'Did somebody say Blu?';

class FakeLLMService implements LLMService {
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
		return 'fake-llm';
	}

	getAvailableModels(): string[] {
		return [];
	}

	async createCompletion(
		options: LLMCompletionOptions,
	): Promise<LLMCompletionResponse> {
		return this.completions(options);
	}

	async createSimpleCompletion(prompt: string, systemPrompt?: string): Promise<string> {
		const response = await this.completions({
			// Minimal mapping for tests; BlueBotService does not use this method directly.
			messages: [
				...(systemPrompt
					? [{ role: 'system', content: systemPrompt } as const]
					: []),
				{ role: 'user', content: prompt },
			],
		} as unknown as LLMCompletionOptions);
		return response.content;
	}
}

describe('BlueBotService static strategy pipeline', () => {
	const enemyId = 'enemy-user-id';

	async function createService(fakeLLM: FakeLLMService) {
		vi.resetModules();
		process.env.BLUEBOT_ENEMY_USER_ID = enemyId;

		const { BlueBotService } = await import('../src/services/bluebot-service');
		const service = BlueBotService.getInstance(fakeLLM);
		// Reset internal timing state between tests.
		(service as any).lastBlueTriggerAt = null;
		return service;
	}

	test('repeated blue mentions within window trigger pleased response', async () => {
		const fakeLLM = new FakeLLMService();
		const service = await createService(fakeLLM);

		const replyFirst = vi.fn();
		const replySecond = vi.fn();

		const baseMessage = {
			author: { id: 'user-1', bot: false, username: 'User1' },
			mentions: { users: { first: () => undefined } },
		} as any;

		await service.processMessage({
			...baseMessage,
			content: 'i love blue magic',
			reply: replyFirst,
		} as any);

		expect(replyFirst).toHaveBeenCalledWith(BLUE_BOT_DEFAULT_RESPONSE);
		expect(fakeLLM.completions).not.toHaveBeenCalled();

		await service.processMessage({
			...baseMessage,
			content: 'blue is still the best',
			reply: replySecond,
		} as any);

		expect(replySecond).toHaveBeenCalledWith('Oh, somebody definitely said blue!');
	});

	test('nice command is kind to normal users', async () => {
		const fakeLLM = new FakeLLMService();
		const service = await createService(fakeLLM);

		const reply = vi.fn();
		const targetId = 'friend-id';

		await service.processMessage({
			content: `bluebot, say something nice about <@${targetId}>`,
			author: { id: 'user-1', bot: false, username: 'Caller' },
			mentions: {
				users: {
					first: () => ({ id: targetId }),
				},
			},
			reply,
		} as any);

		expect(reply).toHaveBeenCalledWith(
			`<@${targetId}>, I think you're pretty blu :wink:`,
		);
		expect(fakeLLM.completions).not.toHaveBeenCalled();
	});

	test('nice command is hostile when target is enemy user', async () => {
		const fakeLLM = new FakeLLMService();
		const service = await createService(fakeLLM);

		const reply = vi.fn();

		await service.processMessage({
			content: `bluebot, say something nice about <@${enemyId}>`,
			author: { id: 'user-1', bot: false, username: 'Caller' },
			mentions: {
				users: {
					first: () => ({ id: enemyId }),
				},
			},
			reply,
		} as any);

		expect(reply).toHaveBeenCalledWith(
			`No way <@${enemyId}> can suck my blu cane. :unamused:`,
		);
		expect(fakeLLM.completions).not.toHaveBeenCalled();
	});

	test('enemy user talking about blue uses enemy LLM prompt', async () => {
		const fakeLLM = new FakeLLMService();
		fakeLLM.completions.mockResolvedValue({
			content: 'Hostile enemy reply',
			model: 'test-model',
			provider: 'fake-llm',
		});
		const service = await createService(fakeLLM);

		const reply = vi.fn();

		await service.processMessage({
			content: 'i still hate blue so much',
			author: { id: enemyId, bot: false, username: 'Enemy' },
			mentions: { users: { first: () => undefined } },
			reply,
		} as any);

		expect(fakeLLM.completions).toHaveBeenCalledTimes(1);
		expect(reply).toHaveBeenCalledWith('Hostile enemy reply');
	});

	test('falls back to LLM strategy when static strategies do not match', async () => {
		const fakeLLM = new FakeLLMService();
		fakeLLM.completions
			// Detection pass: say this is a blue-related message.
			.mockResolvedValueOnce({
				content: 'yes',
				model: 'test-model',
				provider: 'fake-llm',
			})
			// Strategy pass: actual reply.
			.mockResolvedValueOnce({
				content: 'LLM strategy reply',
				model: 'test-model',
				provider: 'fake-llm',
			});

		const service = await createService(fakeLLM);
		const reply = vi.fn();

		await service.processMessage({
			content: 'The way you talk about the azure tide feels very cerulean.',
			author: { id: 'user-1', bot: false, username: 'User1' },
			mentions: { users: { first: () => undefined } },
			reply,
		} as any);

		expect(fakeLLM.completions).toHaveBeenCalledTimes(2);
		expect(reply).toHaveBeenCalledWith('LLM strategy reply');
	});
});
