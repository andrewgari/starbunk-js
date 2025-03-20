export interface HomonymPair {
	words: string[];
	corrections: Record<string, string>;
}

export class HomonymBotConfig {
	static readonly Name = 'HomonymBot';

	static readonly Avatars = {
		Default: 'https://imgur.com/a/0X11DGL'
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
			words: ["where", "wear"],
			corrections: {
				"where": "wear",
				"wear": "where"
			}
		},
		// bored, board
		{
			words: ["bored", "board"],
			corrections: {
				"bored": "board",
				"board": "bored"
			}
		},
		{
			words: ["bored", "board"],
			corrections: {
				"sense": "cents",
				"cents": "sense",
				"scent": "sense"
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
