export interface HomonymPair {
	words: string[];
	corrections: Record<string, string>;
}

export class HomonymBotConfig {
	static readonly Name = 'HomonymBot';

	static readonly Avatars = {
		Default: 'https://i.imgur.com/mWVgriz.png'
	};

	static readonly HomonymPairs: HomonymPair[] = [
		{
			words: ["their", "there", "they're"],
			corrections: {
				"their": "there",
				"there": "their",
				"they're": "their"
			}
		},
		{
			words: ["your", "you're"],
			corrections: {
				"your": "you're",
				"you're": "your"
			}
		},
		{
			words: ["affect", "effect"],
			corrections: {
				"affect": "effect",
				"effect": "affect"
			}
		},
		{
			words: ["weather", "whether"],
			corrections: {
				"weather": "whether",
				"whether": "weather"
			}
		},
		{
			words: ["then", "than"],
			corrections: {
				"then": "than",
				"than": "then"
			}
		},
		{
			words: ["lose", "loose"],
			corrections: {
				"lose": "loose",
				"loose": "lose"
			}
		}
	];
}
