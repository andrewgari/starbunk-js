export const BlueBotConfig = {
	Name: 'BluBot',
	Avatars: {
		Default: 'https://imgur.com/WcBRCWn.png',
		Murder: 'https://imgur.com/Tpo8Ywd.jpg',
		Cheeky: 'https://i.imgur.com/dO4a59n.png'
	},
	Patterns: {
		Default: /\b(blu|blue|bl(o+)|azul|blau|bl(u+)|blew|bl\u00f6|\u0441\u0438\u043d\u0438\u0439|\u9752|\u30d6\u30eb\u30fc|\ube14\uB8E8|\u05DB\u05D7\u05D5\u05DC|\u0928\u0940\u0932\u093E|\u84DD)\b/i,
		Confirm: /\b(blue?(bot)?)|(bot)|yes|no|yep|yeah|(i did)|(you got it)|(sure did)\b/i,
		Nice: /blue?bot,? say something nice about (?<name>.+$)/i,
		Mean: /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i
	},
	Responses: {
		Default: 'Did somebody say Blu?',
		Cheeky: 'Lol, Somebody definitely said Blu! :smile:',
		Request: (message: string) => {
			let name = message.match(BlueBotConfig.Patterns.Nice)?.groups?.name ?? "Hey";

			if (name.toLowerCase() === 'venn') {
				return `No way, Venn can suck my blu cane. :unamused:`
			}

			if (name.toLowerCase() === 'me') {
				name = 'Hey';
			}

			return `${name}, I think you're pretty Blu! :wink: :blue_heart:`
		}
	}
};
