export const mockOpenAI = {
	chat: {
		completions: {
			create: jest.fn()
		}
	}
};

jest.mock('@/openai/openaiClient', () => ({
	openai: mockOpenAI
}));
