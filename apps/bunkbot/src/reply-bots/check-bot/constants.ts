// Constants for Check Bot

export const CHECK_BOT_NAME = 'CheckBot';
export const CHECK_BOT_AVATAR_URL = 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg';

export const CHECK_BOT_PATTERNS = {
	Default: /\b(czech|check)\b/i,
};

// Helper function to swap "check" and "czech"
export function swapCheckAndCzech(content: string): string {
	return content.replace(CHECK_BOT_PATTERNS.Default, (match) => {
		const isLower = match[0].toLowerCase() === match[0];
		const isCheck = match.toLowerCase() === 'check';

		// Determine replacement word
		const replacement = isCheck ? 'czech' : 'check';

		// Preserve original capitalization
		return isLower ? replacement : replacement.charAt(0).toUpperCase() + replacement.slice(1);
	});
}
