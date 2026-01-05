import { Message } from 'discord.js';

// Lightweight mock for shared logger to keep test output clean
jest.mock('@starbunk/shared', () => ({
	logger: {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	},
	ensureError: (err: unknown) => (err instanceof Error ? err : new Error(String(err))),
}));

// Mock prom-client to avoid global registry conflicts in unit tests
jest.mock('prom-client', () => {
	class MockCounter {
		inc = jest.fn();
	}

	class MockHistogram {
		observe = jest.fn();
	}

	class MockGauge {
		set = jest.fn();
	}

	return {
		Counter: MockCounter,
		Histogram: MockHistogram,
		Gauge: MockGauge,
		register: {
			clear: jest.fn(),
		},
		collectDefaultMetrics: jest.fn(),
	};
});

import { ProductionLLMService, type LLMConfig } from '../llmService';

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
}): Message => {
	const { content, isDM = false, isDirectMention = false } = options;
	const botUser = { id: 'bot-id', username: 'CovaBot' } as any;
	const mentionsHas = jest.fn().mockReturnValue(isDirectMention);

	const message: Partial<Message> = {
		content,
		guild: isDM ? undefined : ({} as any),
		client: { user: botUser } as any,
		mentions: { has: mentionsHas } as any,
		author: { id: 'user-1', bot: false, username: 'User' } as any,
	};

	return message as Message;
};

describe('ProductionLLMService.shouldRespond (heuristics)', () => {
	let service: ProductionLLMService;

	beforeEach(() => {
		service = createService();
	});

	afterEach(() => {
		service.destroy();
	});

	it('returns false for empty/whitespace content', async () => {
		const message = createMockMessage({ content: '   ', isDM: true });
		await expect(service.shouldRespond(message)).resolves.toBe(false);
	});

	it('responds to non-trivial DMs', async () => {
		const message = createMockMessage({ content: 'Hello there', isDM: true });
		await expect(service.shouldRespond(message)).resolves.toBe(true);
	});

	it('does not respond to trivial DM without a question', async () => {
		const message = createMockMessage({ content: 'ok', isDM: true });
		await expect(service.shouldRespond(message)).resolves.toBe(false);
	});

	it('responds to direct mentions in guild channels', async () => {
		const message = createMockMessage({ content: 'hey there', isDirectMention: true });
		await expect(service.shouldRespond(message)).resolves.toBe(true);
	});

	it("responds to name mentions of 'cova' in guild channels", async () => {
		const message = createMockMessage({ content: "hey Cova, what's up?" });
		await expect(service.shouldRespond(message)).resolves.toBe(true);
	});

	it('responds to relevant questions about the bot even without explicit name mention', async () => {
		const message = createMockMessage({ content: 'How does this bot work?' });
		await expect(service.shouldRespond(message)).resolves.toBe(true);
	});

	it('stays quiet for unrelated non-question chatter', async () => {
		const message = createMockMessage({ content: "Let's meet for dinner tomorrow." });
		await expect(service.shouldRespond(message)).resolves.toBe(false);
	});
});
