import { Guild, GuildMember, User } from "discord.js";
import userID from "../../discord/userID";

interface BotConstantsConfig {
	[key: string]: {
		Name: string;
		Avatars: {
			[key: string]: string;
		};
		Patterns?: {
			[key: string]: RegExp | undefined;
		};
		Responses: {
			[key: string]: string | string[] | ((...args: string[]) => string);
		};
	};
}

const BotConstants: BotConstantsConfig = {
	Attitude: {
		Name: 'Xander Crews',
		Avatars: {
			Default: 'https://i.ytimg.com/vi/56PMgO3q2-A/sddefault.jpg'
		},
		Patterns: {
			Default: /(you|I|they|we) can'?t/mi
		},
		Responses: {
			Default: 'Well, not with *THAT* attitude!!!'
		}
	},

	Baby: {
		Name: 'BabyBot',
		Avatars: {
			Default: 'https://i.redd.it/qc9qus78dc581.jpg'
		},
		Patterns: {
			Default: /\bbaby\b/i
		},
		Responses: {
			Default: 'https://media.tenor.com/NpnXNhWqKcwAAAAC/metroid-samus-aran.gif'
		}
	},

	Banana: {
		Name: 'BananaBot',
		Avatars: {
			Default: 'https://static.wikia.nocookie.net/donkeykong/images/a/a6/Xananab.jpg/revision/latest/scale-to-width-down/299?cb=20100522010210'
		},
		Patterns: {
			Default: /banana/i
		},
		Responses: {
			Default: [
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
			]
		}
	},

	Blue: {
		Name: 'BluBot',
		Avatars: {
			Default: 'https://imgur.com/WcBRCWn.png',
			Murder: 'https://imgur.com/Tpo8Ywd.jpg',
			Cheeky: 'https://i.imgur.com/dO4a59n.png'
		},
		Patterns: {
			Default: /\b(blu|blue|bl(o+)|azul|blau|bl(u+)|blew|blö|синий|青|ブルー|블루|כחול|नीला|蓝)\b/i,
			Confirm: /\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|(i did)|(you got it)|(sure did)\b/i,
			Nice: /blue?bot,? say something nice about (?<name>.+$)/i,
			Mean: /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i
		},
		Responses: {
			Default: 'Did somebody say Blu?',
			Cheeky: 'Lol, Somebody definitely said Blu! :smile:',
			Request: (message: string) => {
				let name = message.match(getBotPattern('Blue', 'Nice')!)?.groups?.name ?? "Hey";

				if (name.toLowerCase() === 'venn') {
					return `No way, Venn can suck my blu cane. :unamused:`
				}

				if (name.toLowerCase() === 'me') {
					name = 'Hey';
				}

				return `${name}, I think you're pretty Blu! :wink: :blue_heart:`
			}
		}
	},

	Bot: {
		Name: 'BotBot',
		Avatars: {
			Default: 'https://cdn-icons-png.flaticon.com/512/4944/4944377.png'
		},
		Patterns: {
			Default: /bot/i,
		},
		Responses: {
			Default: 'Hello fellow bot!'
		}
	},

	Chaos: {
		Name: 'ChaosBot',
		Avatars: {
			Default: 'https://preview.redd.it/md0lzbvuc3571.png?width=1920&format=png&auto=webp&s=ff403a8d4b514af8d99792a275d2c066b8d1a4de'
		},
		Patterns: {
			Default: /\bchaos\b/i
		},
		Responses: {
			Default: "All I know is...I'm here to kill Chaos"
		}
	},

	Check: {
		Name: 'CheckBot',
		Avatars: {
			Default: 'https://m.media-amazon.com/images/I/21Unzn9U8sL._AC_.jpg'
		},
		Patterns: {
			Default: /\b(czech|check)\b/gi
		},
		Responses: {
			Default: (content: string) => {
				const swapped = content.replace(getBotPattern('Check', 'Default')!, match => {
					const isLower = match[0].toLowerCase() === match[0];
					const isCheck = match.toLowerCase() === "check";

					// Determine replacement word
					const replacement = isCheck ? "czech" : "check";

					// Preserve original capitalization
					return isLower ? replacement : replacement.charAt(0).toUpperCase() + replacement.slice(1);
				});
				return `I believe you meant to say: '${swapped}'.`;
			}
		}
	},


	Ezio: {
		Name: 'Ezio Auditore Da Firenze',
		Avatars: {
			Default: 'https://www.creativeuncut.com/gallery-12/art/ac2-ezio5.jpg'
		},
		Patterns: {
			Default: /\bezio|h?assassin.*\b/i
		},
		Responses: {
			Default: (name: string) => `Remember ${name}, Nothing is true; Everything is permitted.`
		}
	},

	Gundam: {
		Name: 'GundamBot',
		Avatars: {
			Default: 'https://a1.cdn.japantravel.com/photo/41317-179698/1440x960!/tokyo-unicorn-gundam-statue-in-odaiba-179698.jpg'
		},
		Patterns: {
			Default: /\bg(u|a)ndam\b/i
		},
		Responses: {
			Default: 'That\'s the famous Unicorn Robot, "Gandum". There, I said it.'
		}
	},

	Hold: {
		Name: 'HoldBot',
		Avatars: {
			Default: 'https://i.imgur.com/YPFGEzM.png'
		},
		Patterns: {
			Default: /^Hold\.?$/i
		},
		Responses: {
			Default: 'Hold.'
		}
	},

	Macaroni: {
		Name: 'Macaroni Bot',
		Avatars: {
			Default: 'https://i.imgur.com/fgbH6Xf.jpg'
		},
		Patterns: {
			Macaroni: /\b(macaroni?|pasta|venn)\b/gi,
		},
		Responses: {
			Default: (content: string) => {
				const VennCorection = "Correction: you mean Venn \"Tyrone \"The \"Macaroni\" Man\" Johnson\" Caelum";
				const MacaroniMention = (userMention: string): string => `Are you trying to reach <@${userMention}>`;
				const matches = content.match(getBotPattern('Macaroni', 'Macaroni')!)

				if (!matches) { return 'No match found'; };
				if (matches[0].toLowerCase() === "venn") {
					return VennCorection;
				} else {
					return MacaroniMention(userID.Venn);
				}
			}
		},
	},

	MusicCorrect: {
		Name: 'Music Correct Bot',
		Avatars: {
			Default: 'https://i.imgur.com/HXVVfyj.png'
		},
		Patterns: {
			Default: /^[?!]play /i
		},
		Responses: {
			Default: (id: string) => `Hey <@${id}>, Buddy.\nI see you're trying to activate the music bot... I get it, I love to jam it out from time to time. But hey, let me fill you in on a little insider secret.\nYa see, the bot's gone through even **more** *changes* lately (Yeah, Yeah, I know. It keeps on changing how can my tiny brain keep up :unamused:). What *used* to be \`?play\` or \`!play\` has been updated to the shiny new command \`/play\`.\nI know! It's that simple, so if you want to jam it out with your buds or just wanna troll them with some stupid video of a gross man in dirty underpants farting on his roomate's door or .... just the sound of a fart with a little extra revery (I dunno, I'm not judging :shrug:) you can call on me anytime with some youtube link.\n`
		}
	},

	Pickle: {
		Name: 'GremlinBot',
		Avatars: {
			Default: 'https://i.imgur.com/D0czJFu.jpg'
		},
		Patterns: {
			Default: /gremlin/i
		},
		Responses: {
			Default: "Could you repeat that? I don't speak *gremlin*"
		}
	},

	Nice: {
		Name: 'BunkBot',
		Avatars: {
			Default: 'https://pbs.twimg.com/profile_images/421461637325787136/0rxpHzVx.jpeg'
		},
		Patterns: {
			Default: /\b69|(sixty-?nine)\b/i
		},
		Responses: {
			Default: 'Nice.'
		}
	},

	SigGreat: {
		Name: 'SigGreatBot',
		Avatars: {
			Default: 'https://i.imgur.com/D0czJFu.jpg'
		},
		Patterns: {
			Default: /\b(sig|siggles)\s+(?:is\s+)?(best|greatest|awesome|amazing|cool|fantastic|wonderful|excellent|good|great|brilliant|perfect|the\s+best)\b/i,
		},
		Responses: {
			Default: 'SigGreat.'
		}
	},

	Sheesh: {
		Name: 'Sheesh Bot',
		Avatars: {
			Default: 'https://i.imgflip.com/5fc2iz.png?a471000'
		},
		Patterns: {
			Default: /\bshee+sh\b/i
		},
		Responses: {
			Default: () => 'Sh' + 'e'.repeat(Math.floor(Math.random() * 50)) + 'sh 😤'
		}
	},

	Spider: {
		Name: 'Spider-Bot',
		Avatars: {
			Default: 'https://i.pinimg.com/736x/33/e0/06/33e00653eb485455ce5121b413b26d3b.jpg'
		},
		Patterns: {
			Default: /\b(spider-?man|spider\s+-?\s*man)\b/i
		},
		Responses: {
			Default: 'Hey, it\'s "**Spider-Man**"! Don\'t forget the hyphen! Not Spiderman, that\'s dumb'
		}
	},

	Venn: {
		Name: 'VennBot',
		Avatars: {
			Default: ''
		},
		Patterns: {
			Default: /\bcringe\b/i
		},
		Responses: {
			Default: [
				'Sorry, but that was über cringe...',
				'Geez, that was hella cringe...',
				'That was cringe to the max...',
				'What a cringe thing to say...',
				'Mondo cringe, man...',
				"Yo that was the cringiest thing I've ever heard...",
				'Your daily serving of cringe, milord...',
				'On a scale of one to cringe, that was pretty cringe...',
				'That was pretty cringe :airplane:',
				'Wow, like....cringe much?',
				'Excuse me, I seem to have dropped my cringe. Do you have it perchance?',
				'Like I always say, that was pretty cringe...',
				'C.R.I.N.G.E'
			]

		}
	} as const,

	Guy: {
		Name: 'GuyBot',
		Avatars: {
			Default: ''
		},
		Patterns: {
			Default: /\bguy\b/i
		},
		Responses: {
			Default: [
				'What!? What did you say?',
				'Geeeeeet ready for Shriek Week!',
				'Try and keep up mate....',
				'But Who really died that day.\n...and who came back?',
				'Sheeeeeeeeeeeesh',
				"Rats! Rats! Weeeeeeee're the Rats!",
				'The One Piece is REEEEEEEEEEEEEEEEEEAL',
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
				'MisterMisterMisterMisterMisterMisterMisterMisterMisterMisterMisterBeeeeeeeeeeeeeeeeeeeeeeeeeeast',
				"It's a message you can say",
				'Blimbo',
			]
		}
	}
}

// Helper functions for type-safe access
export function getBotConfig(botKey: keyof typeof BotConstants): typeof BotConstants[keyof typeof BotConstants] {
	return BotConstants[botKey];
}

export type BotIdentity = {
	userId: string;
	avatarUrl: string;
	botName: string;
}

export async function getCurrentMemberIdentity(userID: string, guild: Guild): Promise<BotIdentity | undefined> {
	const member: GuildMember | User | undefined =
		await guild.members.fetch(userID) ?? await guild.client.users.fetch(userID);
	if (member) {
		return {
			userId: member.id,
			avatarUrl: member.displayAvatarURL() ?? member.avatarURL,
			botName: member.displayName ?? member.user.username
		};

	}
	return undefined;
}

export function getBotName(botKey: keyof typeof BotConstants): string {
	return BotConstants[botKey].Name
}

export function getBotResponse(botKey: keyof typeof BotConstants, responseKey: string = 'Default', ...args: string[]): string {
	const response = BotConstants[botKey].Responses[responseKey];
	if (Array.isArray(response)) {
		if (response.length === 0) {
			return 'No response found';
		}
		return response[Math.floor(Math.random() * response.length)];
	}
	if (typeof response === 'function') {
		return response(...args);
	}
	return response;
}

export function getBotPattern(botKey: keyof typeof BotConstants, patternKey: string = 'Default'): RegExp | undefined {
	const bot = BotConstants[botKey];
	if (!bot || !bot.Patterns) return undefined;
	return bot.Patterns[patternKey];
}

export function getBotAvatar(botKey: keyof typeof BotConstants, avatarKey: string = 'Default'): string {
	const bot = BotConstants[botKey];
	if (!bot) return 'https://twitter.com/jeanralphio/status/523633061393879040';

	// If the requested avatar doesn't exist, fall back to Default
	return bot.Avatars[avatarKey] || bot.Avatars['Default'] || '';
}
