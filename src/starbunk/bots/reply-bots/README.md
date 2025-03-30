# Reply Bots

This directory contains all reply bots that respond to specific message patterns in Discord channels.

## How Reply Bots Work

Each reply bot:

1. Extends the abstract `ReplyBot` class
2. Monitors messages via the `handleMessage` method
3. Uses regex patterns to detect triggers
4. Responds with pre-configured messages or dynamic content

## Reply Bot Structure

```typescript
export default class ExampleBot extends ReplyBot {
	public readonly botName: string = getBotName('Example');
	public readonly avatarUrl: string = getBotAvatar('Example', 'Default');

	constructor(logger?: ILogger) {
		super(logger);
	}

	async handleMessage(message: Message): Promise<void> {
		if (message.author.bot) return;

		if (getBotPattern('Example', 'Default')?.test(message.content)) {
			const channel = message.channel as TextChannel;
			const response = getBotResponse('Example', 'Default');
			await DiscordService.getInstance().sendMessageWithBotIdentity(
				channel.id,
				{ botName: this.botName, avatarUrl: this.avatarUrl },
				response
			);
		}
	}
}
```

## Available Bots

| Bot             | Trigger Pattern                  | Description                                                                           |
| --------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| AttitudeBot     | `/(you\|I\|they\|we) can'?t/mi`  | Responds to negative statements with "Well, not with THAT attitude!!!"                |
| BabyBot         | `/\bbaby\b/i`                    | Posts a Metroid gif when someone mentions "baby"                                      |
| BananaBot       | `/\bbanana\b/i`                  | Responds to banana mentions                                                           |
| BlueBot         | `/\bbl+u+e+\b/i` and AI analysis | Responds to mentions of the color blue, with special detection for disguised mentions |
| BotBot          | `/\bbot\b/i`                     | Responds when someone mentions the word "bot"                                         |
| ChaosBot        | `/\bchaos\b/i`                   | Reacts to mentions of "chaos"                                                         |
| CheckBot        | `/\bcheck\b/i`                   | Responds to "check" with "✅"                                                         |
| EzioBot         | `/(?:ezio\|assassin)/i`          | Assassin's Creed references                                                           |
| GundamBot       | `/\bgundam\b/i`                  | Responds to Gundam mentions                                                           |
| GuyBot          | `/\bguy\b/i`                     | Responds when someone says "guy"                                                      |
| HoldBot         | `/\bhold it\b/i`                 | Phoenix Wright references                                                             |
| MacaroniBot     | `/\bmac+a*r+o+n+i+\b/i`          | Macaroni-related responses                                                            |
| MusicCorrectBot | `/(?:music\s?correct)/i`         | Corrects music-related statements                                                     |
| NiceBot         | `/\b(nice)\b/i`                  | Responds with "nice"                                                                  |
| PickleBot       | `/\bpickle\b/i`                  | Pickle-related responses                                                              |
| SheeshBot       | `/\bsheesh\b/i`                  | Responds with "SHEEEEEESH"                                                            |
| SigGreatBot     | `/\bsi+g+\s*g+r+e+a+t+\b/i`      | TF2 Soldier references                                                                |
| SpiderBot       | `/\bspider\b/i`                  | Spider-related content                                                                |
| VennBot         | `/\bvenn\b/i`                    | Responds to mentions of "Venn"                                                        |

## Adding New Reply Bots

1. Create a new file named `yourBotNameBot.ts`
2. Add bot configuration to `botConstants.ts` with patterns and responses
3. Follow the ReplyBot structure above
4. The bot will be automatically registered by the StarbunkClient

## Testing Reply Bots

Each bot should have corresponding tests in the `__tests__` directory to verify its behavior.
