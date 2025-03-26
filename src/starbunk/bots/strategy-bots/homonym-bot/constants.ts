// Constants for Homonym Bot

export const HOMONYM_BOT_NAME = 'Gerald';
export const HOMONYM_BOT_AVATAR_URL = 'https://i.imgur.com/zh1Jd8c.jpeg';
export const HOMONYM_BOT_RESPONSE_RATE = 15; // 15% chance to respond

export interface HomonymPair {
	words: string[];
	corrections: Record<string, string>;
}

export const HOMONYM_PAIRS: HomonymPair[] = [
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
	{
		words: ["bored", "board"],
		corrections: {
			"bored": "board",
			"board": "bored"
		}
	},
	{
		words: ["sense", "cents", "scent"],
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
