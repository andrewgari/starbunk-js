import * as promClient from 'prom-client';
export declare class MetricsService {
    private registry;
    private enabled;
    private messagesProcessed;
    private botTriggersTotal;
    private botResponsesTotal;
    private botResponseDuration;
    private botErrorsTotal;
    private activeBotsGauge;
    private uniqueUsersGauge;
    constructor();
    trackMessageProcessed(guildId: string, channelId: string): void;
    trackBotTrigger(botName: string, triggerName: string, guildId: string, channelId: string): void;
    trackBotResponse(botName: string, guildId: string, channelId: string, status: 'success' | 'error'): void;
    trackBotResponseDuration(botName: string, guildId: string, durationMs: number): void;
    trackBotError(botName: string, errorType: string, guildId: string): void;
    setActiveBots(count: number): void;
    trackUniqueUser(botName: string, guildId: string, _userId: string): void;
    getMetrics(): Promise<string>;
    getRegistry(): promClient.Registry;
}
export declare function getMetricsService(): MetricsService;
//# sourceMappingURL=metrics-service.d.ts.map