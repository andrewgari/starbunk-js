import { Message, WebhookClient, Webhook, Client } from 'discord.js';
import { BotIdentity } from '../types/bot-identity';
export declare class WebhookService {
    webhookClient: WebhookClient | null;
    private client;
    constructor(client: Client);
    send(message: Message, identity: BotIdentity, responseText: string): Promise<Webhook>;
    clearWebhooks(guildId: string): Promise<number>;
    private getOrCreateWebhook;
    private getTextChannel;
}
//# sourceMappingURL=webhook-service.d.ts.map