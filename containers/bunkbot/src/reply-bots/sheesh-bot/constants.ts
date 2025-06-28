// Constants for Sheesh Bot
export const SHEESH_BOT_NAME = 'Sheesh Bot';
export const SHEESH_BOT_AVATAR_URL = 'https://i.imgflip.com/5fc2iz.png?a471000';

export const SHEESH_BOT_PATTERNS = {
	Default: /\bshe{2,}sh\b/i
};

// Generate 'sheesh' with a random number of 'e's (between 2 and 20)
export function generateSheeshResponse(): string {
	const eCount = 2 + Math.floor(Math.random() * 18);
	return 'sh' + 'e'.repeat(eCount) + 'sh 😤';
}
