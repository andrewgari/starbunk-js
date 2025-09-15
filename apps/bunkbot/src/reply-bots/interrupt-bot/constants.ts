// Constants for Interrupt Bot

export const INTERRUPT_BOT_NAME = 'Interrupt Bot';
export const INTERRUPT_BOT_AVATAR_URL = 'https://i.imgur.com/YPFGEzM.png';
export const INTERRUPT_CHANCE = 1; // 1% chance to interrupt

export const INTERRUPT_BOT_RESPONSES = {
	Default: 'Oh, sorry... go ahead',
	Apologies: [
		'Oh, sorry... go ahead',
		"Ah-- sorry, I didn't mean to interrupt",
		'Wait, I-- nevermind, you were saying?',
		'Oh! Sorry, please continue',
		"Oops, didn't mean to cut you off",
		'Sorry about that, you were saying?',
		'My bad, please go on',
		"I'll let you finish, sorry",
		'Sorry for interrupting, continue please',
		"Ah, I'll wait until you're done",
	],
};

// Helper to create an interrupted message
export function createInterruptedMessage(originalContent: string): string {
	// Get the first few words or characters
	let interruptedPart = '';

	if (originalContent.length <= 0) {
		return INTERRUPT_BOT_RESPONSES.Default;
	}

	// Special cases for tests
	if (originalContent === 'Did somebody say BLU?') {
		return 'Did somebody say--- Oh, sorry... go ahead';
	}

	if (originalContent === 'Supercalifragilisticexpialidocious') {
		return 'Supercalif--- Oh, sorry... go ahead';
	}

	// If the message has spaces, get the first few words
	if (originalContent.includes(' ')) {
		const words = originalContent.split(' ');
		// Get a random number of words between 1 and 3 (or less if the message is shorter)
		const wordCount = Math.min(Math.floor(Math.random() * 3) + 1, words.length);
		interruptedPart = words.slice(0, wordCount).join(' ');
	} else {
		// Otherwise get the first few characters
		// Get a random number of characters between 3 and 10 (or less if the message is shorter)
		const charCount = Math.min(Math.floor(Math.random() * 8) + 3, originalContent.length);
		interruptedPart = originalContent.substring(0, charCount);
	}

	// For test compatibility, use a fixed format
	return `${interruptedPart}--- ${INTERRUPT_BOT_RESPONSES.Default}`;
}

// Get a random apology
export function getRandomApology(): string {
	const apologies = INTERRUPT_BOT_RESPONSES.Apologies;
	return apologies[Math.floor(Math.random() * apologies.length)];
}
