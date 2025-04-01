import { isDebugMode } from "@/environment";

/**
 * Returns true with the given percent chance (0-100)
 * IMPORTANT: Always returns true (100% chance) when DEBUG is enabled,
 * to make testing more predictable
 * @param percent Percentage chance (0-100)
 * @returns True if random chance hit, false otherwise
 */
export function percentChance(percent: number): boolean {
	// In debug mode, always return true
	if (isDebugMode()) {
		return true;
	}

	// Normal random chance
	return Math.random() * 100 < percent;
}
