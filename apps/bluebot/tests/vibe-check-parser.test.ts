import { describe, test, expect } from 'vitest';
import { parseVibeCheckResponse } from '../src/types/utils/vibe-check-parser';
import { BlueVibe } from '../src/types/enums/blue-vibe';

describe('parseVibeCheckResponse', () => {
	test('parses valid blueGeneral response', () => {
		const response = '{"vibe": "blueGeneral", "intensity": 8, "response": "Did somebody say BLUE?! 💙"}';
		const result = parseVibeCheckResponse(response);

		expect(result.vibe).toBe(BlueVibe.BlueGeneral);
		expect(result.intensity).toBe(8);
		expect(result.response).toBe("Did somebody say BLUE?! 💙");
	});

	test('parses valid blueSneaky response', () => {
		const response = '{"vibe": "blueSneaky", "intensity": 7, "response": "I see what you did there... 👀💙"}';
		const result = parseVibeCheckResponse(response);

		expect(result.vibe).toBe(BlueVibe.BlueSneaky);
		expect(result.intensity).toBe(7);
		expect(result.response).toBe("I see what you did there... 👀💙");
	});

	test('parses valid blueMention response', () => {
		const response = '{"vibe": "blueMention", "intensity": 4, "response": "Blue? 👀"}';
		const result = parseVibeCheckResponse(response);

		expect(result.vibe).toBe(BlueVibe.BlueMention);
		expect(result.intensity).toBe(4);
		expect(result.response).toBe("Blue? 👀");
	});

	test('parses valid blueRequest response', () => {
		const response = '{"vibe": "blueRequest", "intensity": 10, "response": "@User, you\'re as blue-tiful as the sky! 💙"}';
		const result = parseVibeCheckResponse(response);

		expect(result.vibe).toBe(BlueVibe.BlueRequest);
		expect(result.intensity).toBe(10);
		expect(result.response).toBe("@User, you're as blue-tiful as the sky! 💙");
	});

	test('parses valid notBlue response with empty string', () => {
		const response = '{"vibe": "notBlue", "intensity": 1, "response": ""}';
		const result = parseVibeCheckResponse(response);

		expect(result.vibe).toBe(BlueVibe.NotBlue);
		expect(result.intensity).toBe(1);
		// Empty strings are treated as undefined
		expect(result.response).toBeUndefined();
	});

	test('parses response without response field', () => {
		const response = '{"vibe": "blueGeneral", "intensity": 5}';
		const result = parseVibeCheckResponse(response);

		expect(result.vibe).toBe(BlueVibe.BlueGeneral);
		expect(result.intensity).toBe(5);
		expect(result.response).toBeUndefined();
	});

	test('handles intensity as string and converts to number', () => {
		const response = '{"vibe": "blueGeneral", "intensity": "8", "response": "Blue!"}';
		const result = parseVibeCheckResponse(response);

		expect(result.intensity).toBe(8);
	});

	test('falls back to notBlue for invalid vibe', () => {
		const response = '{"vibe": "invalidVibe", "intensity": 5, "response": "test"}';
		const result = parseVibeCheckResponse(response);

		expect(result.vibe).toBe(BlueVibe.NotBlue);
		expect(result.intensity).toBe(1);
		expect(result.response).toBeUndefined();
	});

	test('falls back to notBlue for intensity out of range (too low)', () => {
		const response = '{"vibe": "blueGeneral", "intensity": 0, "response": "test"}';
		const result = parseVibeCheckResponse(response);

		expect(result.vibe).toBe(BlueVibe.NotBlue);
		expect(result.intensity).toBe(1);
	});

	test('falls back to notBlue for intensity out of range (too high)', () => {
		const response = '{"vibe": "blueGeneral", "intensity": 11, "response": "test"}';
		const result = parseVibeCheckResponse(response);

		expect(result.vibe).toBe(BlueVibe.NotBlue);
		expect(result.intensity).toBe(1);
	});

	test('falls back to notBlue for invalid JSON', () => {
		const response = 'not valid json';
		const result = parseVibeCheckResponse(response);

		expect(result.vibe).toBe(BlueVibe.NotBlue);
		expect(result.intensity).toBe(1);
		expect(result.response).toBeUndefined();
	});

	test('falls back to notBlue for empty string', () => {
		const response = '';
		const result = parseVibeCheckResponse(response);

		expect(result.vibe).toBe(BlueVibe.NotBlue);
		expect(result.intensity).toBe(1);
	});

	test('trims whitespace from response', () => {
		const response = '{"vibe": "blueGeneral", "intensity": 5, "response": "  Blue!  "}';
		const result = parseVibeCheckResponse(response);

		expect(result.response).toBe("Blue!");
	});

	test('handles response with special characters', () => {
		const response = '{"vibe": "blueGeneral", "intensity": 8, "response": "Blue! 💙🔵✨"}';
		const result = parseVibeCheckResponse(response);

		expect(result.response).toBe("Blue! 💙🔵✨");
	});

	test('handles response with newlines', () => {
		const response = '{"vibe": "blueGeneral", "intensity": 7, "response": "Blue!\\nSo blue!"}';
		const result = parseVibeCheckResponse(response);

		expect(result.response).toBe("Blue!\nSo blue!");
	});
});

