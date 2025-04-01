// Constants for Chad Bot
export const CHAD_BOT_NAME = 'Chad';
export const CHAD_BOT_AVATAR_URL = 'https://i.imgur.com/XFDYZYz.png';

// Chad's responses
export const CHAD_RESPONSES = {
	BRO: [
		"BRO!",
		"That's what I'm talking about bro!",
		"BROOOOOO",
		"Bro, that's epic."
	],
	GYM: [
		"Never skip leg day bro",
		"Hit those gains!",
		"You're gonna make it bro"
	],
	PROTEIN: [
		"Gotta get those macros in",
		"Protein shake time!",
		"Need those gainz"
	],
	DEFAULT: "What is Bro Yapping About..."
};

// Keyword patterns
export const CHAD_PATTERNS = {
	BRO: /\b(bro|bruh|bruv|brother|homie|dude)\b/i,
	GYM: /\b(gym|workout|lift|gains|muscles|reps|sets)\b/i,
	PROTEIN: /\b(protein|supplements|creatine|pre-workout|macros)\b/i
};
