// Mock for @xenova/transformers
export const pipeline = jest.fn().mockImplementation(() => {
	return jest.fn().mockResolvedValue([
		{
			label: 'POSITIVE',
			score: 0.9998
		}
	]);
});

export default {
	pipeline
};
