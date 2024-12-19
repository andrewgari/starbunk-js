import { Message } from 'discord.js';
import ReplyBot from '../replyBot';

class ReiBot extends ReplyBot {
  private readonly name = 'ReiBot';

    getBotName(): string {
        return this.name;
    }
    getAvatarUrl(): string {
        return "";
    }
    handleMessage(message: Message<boolean>): void {

    }

}
