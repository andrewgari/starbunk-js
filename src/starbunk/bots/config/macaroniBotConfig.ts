import userId from '../../../discord/userId';

export const MacaroniBotConfig = {
	Name: 'Macaroni Bot',
	Avatars: {
		Default: 'https://i.imgur.com/fgbH6Xf.jpg'
	},
	Patterns: {
		Macaroni: /\b(macaroni|pasta|venn)\b/i,
	},
	Responses: {
		Default: (content: string) => {
			const VennCorrection = "Correction: you mean Venn \"Tyrone \"The \"Macaroni\" Man\" Johnson\" Caelum";
			const MacaroniMention = (userMention: string): string => `Are you trying to reach <@${userMention}>`;
			const matches = content.match(MacaroniBotConfig.Patterns.Macaroni);

			if (!matches) { return 'No match found'; };
			if (matches[0].toLowerCase() === "venn") {
				return VennCorrection;
			} else {
				return MacaroniMention(userId.Venn);
			}
		}
	},
};
