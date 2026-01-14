import { BlueVibe } from '../enums/blue-vibe';

/**
 * Result of a vibe check, including the detected vibe and intensity
 */
export interface VibeCheckResult {
	/** The detected vibe category */
	vibe: BlueVibe;
	/** Intensity from 1-10, where higher means more likely to respond */
	intensity: number;
}

