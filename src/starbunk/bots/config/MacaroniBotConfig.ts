import userID from "@/discord/userID";

export const MacaroniBotConfig = {
	Name: 'Macaroni Bot',
	Avatars: {
		Default: 'https://i.imgur.com/fgbH6Xf.jpg'
	},
	Patterns: {
		Macaroni: /\b(macaroni?|pasta|venn)\b/gi,
	},
	Responses: {
		Default: (content: string) => {
			const VennCorection = "Correction: you mean Venn \"Tyrone \"The \"Macaroni\" Man\" Johnson\" Caelum";
			const MacaroniMention = (userMention: string): string => `Are you trying to reach <@${userMention}>`;
			const matches = content.match(MacaroniBotConfig.Patterns.Macaroni);

			if (!matches) { return 'No match found'; };
			if (matches[0].toLowerCase() === "venn") {
				return VennCorection;
			} else {
				return MacaroniMention(userID.Venn);
			}
		}
	},
};
