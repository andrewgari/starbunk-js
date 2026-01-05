import { BLUE_BOT_NAME, BLUE_BOT_PATTERNS, BLUE_BOT_RESPONSES } from '../src/constants';

describe('BlueBot Constants', () => {
	it('should have correct bot name', () => {
		expect(BLUE_BOT_NAME).toBe('BluBot');
	});

	it('should have default pattern that matches "blue"', () => {
		expect(BLUE_BOT_PATTERNS.Default.test('blue')).toBe(true);
		expect(BLUE_BOT_PATTERNS.Default.test('blu')).toBe(true);
		expect(BLUE_BOT_PATTERNS.Default.test('hello blue world')).toBe(true);
	});

	it('should have default response', () => {
		expect(BLUE_BOT_RESPONSES.Default).toBe('Did somebody say Blu?');
	});

	it('should have murder response', () => {
		expect(BLUE_BOT_RESPONSES.Murder).toContain('Blue Mages');
	});

	it('should have cheeky responses array', () => {
		expect(Array.isArray(BLUE_BOT_RESPONSES.Cheeky)).toBe(true);
		expect(BLUE_BOT_RESPONSES.Cheeky.length).toBeGreaterThan(0);
	});
});
