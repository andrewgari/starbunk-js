jest.mock('fs', () => ({
	promises: {
		mkdir: jest.fn(),
		writeFile: jest.fn(),
		readFile: jest.fn(),
	},
}));

// ... rest of the test file ...

describe('JsonFileStorage', () => {
	it('needs tests', () => {
		expect(true).toBe(true);
	});
});
