/**
 * Utilities for working with Discord webhooks.
 */

/**
 * Extracts the numeric webhook ID from a Discord webhook URL.
 * Example: https://discord.com/api/webhooks/123456789012345678/xxxxx -> "123456789012345678"
 *
 * @param url Discord webhook URL
 * @returns the numeric webhook ID if present, otherwise undefined
 */
export function extractWebhookId(url: string | undefined | null): string | undefined {
	if (!url) return undefined;
	const match = String(url).match(/webhooks\/(\d+)\//);
	return match ? match[1] : undefined;
}
