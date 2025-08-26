// Constants for Guy Bot
// Bot name and avatar URL are now resolved dynamically from Discord

export const GUY_BOT_PATTERNS = {
	Default: /\bguy\b/i,
};

export const GUY_BOT_RESPONSES = [
	'What!? What did you say?',
	'Geeeeeet ready for Shriek Week!',
	'Try and keep up mate....',
	'But Who really died that day.\n...and who came back?',
	'Sheeeeeeeeeeeesh',
	"Rats! Rats! Weeeeeeee're the Rats!",
	'The One Piece is REEEEEEEEEEEEEEEEAL',
	'Psh, I dunno about that, Chief...',
	'Come to me my noble EINHERJAHR',
	"If you can't beat em, EAT em!",
	'Have you ever been so sick you sluiced your pants?',
	"Welcome back to ... Melon be Smellin'",
	"Chaotic Evil: Don't Respond. :unamused:",
	':NODDERS: Big Boys... :NODDERS:',
	'Fun Fact: That was actually in XI as well.',
	'Bird Up!',
	'Schlorp',
	"I wouldn't dream of disturbing something so hideously erogenous",
	'Good Year, Good Year',
	'True Grit',
	'MisterMisterMisterMisterMisterMisterMisterMisterMisterMisterMisterMisterBeeeeeeeeeeeeeeeeeeeeeeeeeeast',
	"It's a message you can say",
	'Blimbo',
	'Good News, we can finally be bees',
	"That's what they called me in High School",
	"That's what's happenin'",
];

// Helper function to get a random response
export function getRandomGuyResponse(): string {
	return GUY_BOT_RESPONSES[Math.floor(Math.random() * GUY_BOT_RESPONSES.length)];
}
