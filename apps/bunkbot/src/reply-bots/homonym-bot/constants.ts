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
		words: ['their', 'there', "they're"],
		corrections: {
			their: 'there',
			there: 'their',
			"they're": 'their',
		},
	},
	{
		words: ['your', "you're"],
		corrections: {
			your: "you're",
			"you're": 'your',
		},
	},
	{
		words: ['where', 'wear', 'ware'],
		corrections: {
			where: 'wear',
			wear: 'ware',
			ware: 'where',
		},
	},
	{
		words: ['bored', 'board'],
		corrections: {
			bored: 'board',
			board: 'bored',
		},
	},
	{
		words: ['sense', 'cents', 'scents'],
		corrections: {
			sense: 'cents',
			cents: 'scents',
			scents: 'sense',
		},
	},
	{
		words: ['affect', 'effect'],
		corrections: {
			affect: 'effect',
			effect: 'affect',
		},
	},
	{
		words: ['weather', 'whether'],
		corrections: {
			weather: 'whether',
			whether: 'weather',
		},
	},
	{
		words: ['then', 'than'],
		corrections: {
			then: 'than',
			than: 'then',
		},
	},
	{
		words: ['lose', 'loose'],
		corrections: {
			lose: 'loose',
			loose: 'lose',
		},
	},
	{
		words: ['to', 'too', 'two'],
		corrections: {
			to: 'two',
			too: 'to',
			two: 'too',
		},
	},
	{
		words: ['hear', 'here'],
		corrections: {
			hear: 'here',
			here: 'hear',
		},
	},
	{
		words: ['write', 'right', 'rite'],
		corrections: {
			write: 'right',
			right: 'rite',
			rite: 'write',
		},
	},
	{
		words: ['its', "it's"],
		corrections: {
			its: "it's",
			"it's": 'its',
		},
	},
	{
		words: ['accept', 'except'],
		corrections: {
			accept: 'except',
			except: 'accept',
		},
	},
	{
		words: ['brake', 'break'],
		corrections: {
			brake: 'break',
			break: 'brake',
		},
	},
	{
		words: ['complement', 'compliment'],
		corrections: {
			complement: 'compliment',
			compliment: 'complement',
		},
	},
	{
		words: ['desert', 'dessert'],
		corrections: {
			desert: 'dessert',
			dessert: 'desert',
		},
	},
	{
		words: ['principal', 'principle'],
		corrections: {
			principal: 'principle',
			principle: 'principal',
		},
	},
	{
		words: ['stationary', 'stationery'],
		corrections: {
			stationary: 'stationery',
			stationery: 'stationary',
		},
	},
	{
		words: ["who's", 'whose'],
		corrections: {
			"who's": 'whose',
			whose: "who's",
		},
	},
	{
		words: ['past', 'passed'],
		corrections: {
			past: 'passed',
			passed: 'past',
		},
	},
	{
		words: ['peace', 'piece'],
		corrections: {
			peace: 'piece',
			piece: 'peace',
		},
	},
	{
		words: ['bare', 'bear'],
		corrections: {
			bare: 'bear',
			bear: 'bare',
		},
	},
	{
		words: ['role', 'roll'],
		corrections: {
			role: 'roll',
			roll: 'role',
		},
	},
	{
		words: ['cite', 'site', 'sight'],
		corrections: {
			cite: 'site',
			site: 'sight',
			sight: 'cite',
		},
	},
];

// Helper function to get a random correction for a word
export function getRandomCorrection(word: string): string | null {
	const lowerWord = word.toLowerCase();
	const pair = HOMONYM_PAIRS.find((p) => p.words.includes(lowerWord));
	if (!pair) return null;
	return pair.corrections[lowerWord];
}
