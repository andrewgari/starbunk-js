import userId from '../../../discord/userId';

export const MacaroniBotConfig = {
	Name: 'Macaroni Bot',
	Avatars: {
		Default: 'https://i.imgur.com/fgbH6Xf.jpg'
	},
	Patterns: {
		Macaroni: /\bmacaroni|pasta\b/i,
		Venn: /\bvenn\b/i,
	},
	Responses: {
		Macaroni: `Correction: you mean Venn "Tyrone "The "Macaroni" Man" Johnson" Caelum`,
		Venn: `Are you trying to reach <@${userId.Venn}>`,
	},
};
