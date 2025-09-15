// Constants for Banana Bot
export const BANANA_BOT_NAME = 'BananaBot';
export const BANANA_BOT_AVATAR_URL =
	'https://static.wikia.nocookie.net/donkeykong/images/a/a6/Xananab.jpg/revision/latest/scale-to-width-down/299?cb=20100522010210';

export const BANANA_BOT_PATTERNS = {
	Default: /banana/i,
};

export const BANANA_BOT_RESPONSES = [
	"Always bring a :banana: to a party, banana's are good!",
	"Don't drop the :banana:, they're a good source of potassium!",
	"If you gave a monkey control over it's environment, it would fill the world with :banana:s...",
	'Banana. :banana:',
	"Don't judge a :banana: by it's skin.",
	'Life is full of :banana: skins.',
	'OOOOOOOOOOOOOOOOOOOOOH BA NA NA :banana:',
	':banana: Slamma!',
	'A :banana: per day keeps the Macaroni away...',
	"const bestFruit = ('b' + 'a' + + 'a').toLowerCase(); :banana:",
	"Did you know that the :banana:s we have today aren't even the same species of :banana:s we had 50 years ago. The fruit has gone extinct over time and it's actually a giant eugenics experimet to produce new species of :banana:...",
	"Monkeys always ask ''Wher :banana:', but none of them ask 'How :banana:?'",
	':banana: https://www.tiktok.com/@tracey_dintino_charles/video/7197753358143278378?_r=1&_t=8bFpt5cfIbG',
	'*slides in on banana peel* :banana: ALERT! :banana: ALERT! We have a :banana: reference!!',
	'*dressed in full banana costume* You rang? :banana:',
	'Stop! :banana: time! *does a dance*',
	'*jumps out of a banana pile* SURPRISE! :banana:',
	'Did I hear the magic word? :banana: :banana: :banana:!',
	'*monkey noises intensify* :banana:! :banana:! :banana:!',
	'This conversation just got a whole lot more ap-PEEL-ing! :banana:',
	"*dramatically points* That's what she said... BANANA! :banana:",
	'BREAKING NEWS: :banana: mentioned in chat! This is not a drill!',
];

// Helper function to get a random response
export function getRandomBananaResponse(): string {
	return BANANA_BOT_RESPONSES[Math.floor(Math.random() * BANANA_BOT_RESPONSES.length)];
}
