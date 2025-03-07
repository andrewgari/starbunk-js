// import { getBotPattern } from "../botConstants";

export const CheckBotConfig = {
	Name: 'CheckBot',
	Avatars: {
		Default: 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg'
	},
	Patterns: {
		Default: /\b(czech|check)\b/gi
	},
	Responses: {
		Default: (content: string) => {
			const swapped = content.replace(CheckBotConfig.Patterns.Default, match => {
				const isLower = match[0].toLowerCase() === match[0];
				const isCheck = match.toLowerCase() === "check";

				// Determine replacement word
				const replacement = isCheck ? "czech" : "check";

				// Preserve original capitalization
				return isLower ? replacement : replacement.charAt(0).toUpperCase() + replacement.slice(1);
			});
			return `I believe you meant to say: '${swapped}'.`;
		}
	}
};
