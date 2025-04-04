// Mock implementation of @xenova/transformers
export const pipeline = jest.fn().mockImplementation(() => ({
	// Mock pipeline functions
	embed: jest.fn().mockResolvedValue(new Float32Array([0.1, 0.2, 0.3])),
}));

// Mock other exports as needed
export const AutoTokenizer = {
	from_pretrained: jest.fn().mockResolvedValue({
		encode: jest.fn().mockReturnValue({ input_ids: [1, 2, 3] }),
		decode: jest.fn().mockReturnValue("decoded text"),
	}),
};

export const AutoModel = {
	from_pretrained: jest.fn().mockResolvedValue({
		forward: jest.fn().mockResolvedValue({ last_hidden_state: [[0.1, 0.2, 0.3]] }),
	}),
};
