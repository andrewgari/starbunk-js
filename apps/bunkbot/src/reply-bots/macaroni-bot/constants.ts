// Constants for Macaroni Bot
export const MACARONI_BOT_NAME = 'Macaroni Bot';
export const MACARONI_BOT_AVATAR_URL = 'https://i.imgur.com/fgbH6Xf.jpg';

export const MACARONI_BOT_PATTERNS = {
	Macaroni: /\bmacaroni|pasta\b/i,
	Venn: /\bvenn\b/i,
};

export const MACARONI_BOT_RESPONSES = {
	Macaroni: `Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum`,
	// Note: Venn response now uses dynamic user ID lookup
	VennBase: `Are you trying to reach <@{VENN_USER_ID}>`,
};
