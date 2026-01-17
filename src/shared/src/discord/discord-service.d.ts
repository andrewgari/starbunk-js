import { Client, GuildMember, Message, TextChannel } from 'discord.js';
import { WebhookService } from './webhook-service';
import { BotIdentity } from '../types/bot-identity';
export declare class DiscordService implements DiscordService {
    private static instance;
    private client;
    private webhookService;
    private constructor();
    static getInstance(): DiscordService;
    setClient(client: Client): void;
    getClient(): Client;
    getWebhookService(): WebhookService;
    getMemberById(guildId: string, memberId: string): Promise<GuildMember>;
    getChannel(channelId: string): Promise<TextChannel>;
    getBotIdentityFromDiscord(guildId: string, memberId: string): Promise<BotIdentity>;
    sendMessageWithBotIdentity(message: Message, botIdentity: BotIdentity, responseText: string): Promise<void>;
}
//# sourceMappingURL=discord-service.d.ts.map