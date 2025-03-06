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
		Nice: /blue?bot,? say something nice about (?<n>.+$)/i,
		Mean: /\b(fuck(ing)?|hate|die|kill|worst|mom|shit|murder|bots?)\b/i
	},
	Responses: {
		Default: 'Did somebody say Blu?',
		Cheeky: 'Lol, Somebody definitely said Blu! :smile:',
		Murder: "What the fuck did you just fucking say about me, you little bitch? I'll have you know I graduated top of my class in the Blue Mages, and I've been involved in numerous secret raids on The Carnival, and I have over 300 confirmed spells. I am trained in primal warfare and I'm the top spell slinger in the entire FFXIV armed forces. You are nothing to me but just another target. I will wipe you the fuck out with precision the likes of which has never been seen before on Eorzea, mark my fucking words. You think you can get away with saying that shit to me over the Discord? Think again, fucker. As we speak I am contacting my secret network of Masked Carnivale Mages across Eorzea and your character ID is being traced right now so you better prepare for the storm, maggot. The storm that wipes out the pathetic little thing you call your life. You're fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, and that's just with my bare cane. Not only am I extensively trained in blue magic combat, but I have access to the entire arsenal of the Eorzean Blue Magic League and I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. If only you could have known what unholy retribution your little \"clever\" comment was about to bring down upon you, maybe you would have held your fucking tongue. But you couldn't, you didn't, and now you're paying the price, you goddamn idiot. I will shit fury all over you and you will drown in it. You're fucking dead, kiddo.",
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
