import { BlueVibe } from '../enums/blue-vibe';
import { VibeCheckResult } from '../interfaces/vibe-check-result';

/**
 * Parse a vibe check response from the LLM
 * Expected format: {"vibe": "blueGeneral", "intensity": 8}
 */
export function parseVibeCheckResponse(response: string): VibeCheckResult {
	try {
		const parsed = JSON.parse(response.trim());

		// Validate vibe is a valid enum value
		const vibe = parsed.vibe as BlueVibe;
		if (!Object.values(BlueVibe).includes(vibe)) {
			throw new Error(`Invalid vibe: ${parsed.vibe}`);
		}

		// Validate intensity is a number between 1 and 10
		const intensity = parseInt(parsed.intensity, 10);
		if (isNaN(intensity) || intensity < 1 || intensity > 10) {
			throw new Error(`Invalid intensity: ${parsed.intensity}`);
		}

		return { vibe, intensity };
	} catch {
		// Fallback to notBlue with minimal intensity if parsing fails
		return {
			vibe: BlueVibe.NotBlue,
			intensity: 1,
		};
	}
}

