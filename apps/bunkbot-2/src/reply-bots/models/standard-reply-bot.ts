import { ResponseResolver } from "@/reply-bots/responses/response-resolver";
import { ReplyBot} from "./reply-bot";
import { Message } from 'discord.js';
import { DiscordService } from "@/discord/discord-service";
import { BotIdentity } from "./bot-identity";
import { Trigger } from "@/reply-bots/conditions/trigger";

export class StandardReplyBot implements ReplyBot {
  constructor(
    public name: string,
    public readonly identityResolver: (message: Message<boolean>) => Promise<BotIdentity>,
    public triggers: Trigger[],
    public ignore_bots: boolean = true,
    public ignore_humans: boolean = false,

  ) {}

  get identity() {
    return this.identityResolver;
  }

  public async handleMessage(message: Message): Promise<void> {
    // Implementation to handle the message
    for (const trigger of this.triggers) {
      if (await trigger.condition(message)) {
        const identity = await this.identity(message);
        let response = trigger.responseGenerator(message);
        response = await ResponseResolver.resolve(response, message);

        await DiscordService.getInstance().sendMessageWithBotIdentity(
          message,
          identity,
          response,
        );
        return;
      }
    }
  }
}
