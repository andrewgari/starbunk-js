// Constants for Spider Bot
export const SPIDER_BOT_NAME = 'Spider-Bot';
export const SPIDER_BOT_AVATAR_URL = 'https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg';

export const SPIDER_BOT_PATTERNS = {
	Default: /spider(?!-).*man/i, // Matches "spiderman", "spider man", "spider_man", etc. but NOT "spider-man"
	Correct: /spider-man/i,
};

export const SPIDER_BOT_RESPONSES = {
	Default: [
		'Hey, it\'s "**Spider-Man**"! Don\'t forget the hyphen!',
		"Um, excuse me? It's **Spider-Man**. Hyphen between Spider and Man. Respect the hyphen!",
		'With great power comes great responsibility... to spell **Spider-Man** correctly with a hyphen!',
		'My spider-sense tingles whenever someone forgets the hyphen in **Spider-Man**!',
		"Actually, it's **Spider-Man**. You know what separates me from the average arachnid? A hyphen.",
		'J. Jonah Jameson may call me a menace, but even he knows to put the hyphen in **Spider-Man**!',
		'The hyphen in **Spider-Man** is as important as the web in my web-shooters!',
		'**Spider-Man**, two words with a hyphen! Uncle Ben would want you to remember that.',
		"That's **Spider-Man** to you! The hyphen is part of my brand identity!",
		'*Swings in dramatically* DID SOMEONE JUST MISSPELL **SPIDER-MAN**?! THE HYPHEN IS SACRED!',
		"*Sticks to ceiling* Listen here, buddy. It's **Spider-Man** with a hyphen. Got it? Good talk!",
		'*Shoots web at your keyboard* Let me fix that for you... S-P-I-D-E-R-**HYPHEN**-M-A-N!',
		'As your friendly neighborhood grammar police, I must insist on the hyphen in **Spider-Man**!',
		'*Does theatrical backflip* Ta-da! Just like that hyphen does a flip between Spider and Man!',
		"Thwip thwip! That's the sound of me web-slinging AND the sound of typing a hyphen in **Spider-Man**!",
		'Not to be dramatic, but forgetting the hyphen in **Spider-Man** is my villain origin story.',
		"Spider-sense... tingling... someone... forgot... the... HYPHEN! It's **Spider-Man**!",
		'With great spelling comes great hyphens! **Spider-Man**! Say it with me!',
		"*Hangs upside down* From this angle, I can clearly see you're missing the hyphen in **Spider-Man**.",
	],
	Correct: [
		"Hey, you used the hyphen! You're one of the good ones!",
		'*wipes away tear* Finally, someone who understands the importance of the hyphen!',
		"Now that's what I call proper Spider-Man spelling! Keep up the good work!",
		'*happy spider noises* The hyphen! You remembered the hyphen!',
		'Uncle Ben would be proud of your proper hyphen usage!',
		'With great power comes great responsibility to use hyphens correctly - and you nailed it!',
		'My spider-sense is tingling with joy at your proper hyphenation!',
		"*does a celebratory web-swing* You're a true Spider-Fan!",
		"J. Jonah Jameson might call me a menace, but even he'd approve of your spelling!",
		"You're the hero the English language deserves!",
	],
};

// Helper functions to get random responses
export function getRandomCheekyResponse(): string {
	return SPIDER_BOT_RESPONSES.Default[Math.floor(Math.random() * SPIDER_BOT_RESPONSES.Default.length)];
}

export function getRandomPositiveResponse(): string {
	return SPIDER_BOT_RESPONSES.Correct[Math.floor(Math.random() * SPIDER_BOT_RESPONSES.Correct.length)];
}
