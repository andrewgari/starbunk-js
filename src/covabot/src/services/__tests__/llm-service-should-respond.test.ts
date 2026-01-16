import { describe, it, expect, vi } from 'vitest';
import { Message } from 'discord.js';

// Lightweight mock for shared logger to keep test output clean
vi.mock('@starbunk/shared', () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
	ensureError: (err: unknown) => (err instanceof Error ? err : new Error(String(err))),
}));

// Mock prom-client to avoid global registry conflicts in unit tests
vi.mock('prom-client', () => {
	class MockCounter {
		inc = vi.fn();
	}

	class MockHistogram {
		observe = vi.fn();
	}

	class MockGauge {
		set = vi.fn();
	}

	return {
		Counter: MockCounter,
		Histogram: MockHistogram,
		Gauge: MockGauge,
		register: {
			clear: vi.fn(),
		},
		collectDefaultMetrics: vi.fn(),
	};
});

import { ProductionLLMService, type LLMConfig } from '../llm-service';

const createService = () => {
	const config: LLMConfig = {
		provider: 'emulator',
	};
	return new ProductionLLMService(config);
};

const createMockMessage = (options: {
	content: string;
	isDM?: boolean;
	isDirectMention?: boolean;
	isBotAuthor?: boolean;
	channelId?: string;
}): Message => {
	const { content, isDM = false, isDirectMention = false, isBotAuthor = false, channelId = 'test-channel' } = options;
	const botUser = { id: 'bot-id', username: 'CovaBot' } as any;
	const mentionsHas = vi.fn().mockReturnValue(isDirectMention);
	const channel = { id: channelId } as any;

	const message: Partial<Message> = {
		content,
		guild: isDM ? undefined : ({} as any),
		client: { user: botUser } as any,
		mentions: { has: mentionsHas } as any,
		author: { id: 'user-1', bot: isBotAuthor, username: 'User' } as any,
		channel,
	};

	return message as Message;
};

describe('ProductionLLMService.shouldRespond (probabilistic heuristics)', () => {
	let service: ProductionLLMService;
	let randomSpy: jest.SpyInstance | undefined;

	beforeEach(() => {
		service = createService();
	});

	afterEach(() => {
		service.destroy();
		if (randomSpy) {
			randomSpy.mockRestore();
			randomSpy = undefined;
		}
	});

	it('returns false for empty/whitespace content', async () => {
		const message = createMockMessage({ content: '   ' });
		await expect(service.shouldRespond(message)).resolves.toBe(false);
	});

	it('returns false for bot authors', async () => {
		const message = createMockMessage({ content: 'Hello there', isBotAuthor: true });
		await expect(service.shouldRespond(message)).resolves.toBe(false);
	});

	it('always responds to direct mentions', async () => {
		const message = createMockMessage({ content: 'hey there', isDirectMention: true });
		randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.999);
		await expect(service.shouldRespond(message)).resolves.toBe(true);
	});

	it('does not treat non-mentions as direct mentions', async () => {
		// Same structure as a normal guild message, but isDirectMention=false
		const message = createMockMessage({ content: 'hey there', isDirectMention: false });
		randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.999);

		// With a very high random roll and no other strong signals, this should
		// be gated off by the probabilistic heuristic (i.e., not treated as a
		// deterministic direct mention path).
		await expect(service.shouldRespond(message)).resolves.toBe(false);
	});

	it('handles missing client user safely when checking direct mentions', async () => {
		const mentionsHas = jest.fn().mockImplementation(() => {
			throw new Error('mentions.has boom');
		});

		const message: any = {
			content: 'hello there',
			client: {}, // no user on client
			mentions: { has: mentionsHas },
			guild: {} as any,
			author: { id: 'user-1', bot: false, username: 'User' } as any,
			channel: { id: 'edge-case-channel' } as any,
		};

		randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.999);

		// The helper should catch the error and simply return false for
		// isDirectMention, causing us to fall back to the probabilistic path.
		await expect(service.shouldRespond(message as any)).resolves.toBe(false);
	});

	it('always responds to text mentions of "covabot"', async () => {
		const message = createMockMessage({ content: 'hey Covabot, what do you think?' });
		randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.999);
		await expect(service.shouldRespond(message)).resolves.toBe(true);
	});

	it('treats "cova" as a probabilistic boost, not deterministic', async () => {
		const message = createMockMessage({ content: 'cova' });
		randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.0);
		await expect(service.shouldRespond(message)).resolves.toBe(true);

		// With a very high random roll, the same content should be gated off
		randomSpy.mockReturnValue(0.999);
		const message2 = createMockMessage({ content: 'cova' });
		await expect(service.shouldRespond(message2)).resolves.toBe(false);
	});

	it('increases probability for relevant keyword questions', async () => {
		const message = createMockMessage({ content: 'How does this bot work?' });
		randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.0);
		await expect(service.shouldRespond(message)).resolves.toBe(true);

		// High roll should typically fall above the computed probability and be gated off
		randomSpy.mockReturnValue(0.9);
		const message2 = createMockMessage({ content: 'How does this bot work?' });
		await expect(service.shouldRespond(message2)).resolves.toBe(false);
	});

	it('increases probability as the channel becomes more active', async () => {
		randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.15);
		const quietMessage = createMockMessage({ content: 'hello there', channelId: 'activity-channel' });
		await expect(service.shouldRespond(quietMessage)).resolves.toBe(false);

		// Simulate a burst of messages in the same channel to raise activity
		const filler = createMockMessage({ content: 'filler', channelId: 'activity-channel' });
		for (let i = 0; i < 30; i++) {
			// We don't care about the decision here, only that activity is recorded
			await service.shouldRespond(filler);
		}

		const activeMessage = createMockMessage({ content: 'hello there', channelId: 'activity-channel' });
		await expect(service.shouldRespond(activeMessage)).resolves.toBe(true);
	});
});
