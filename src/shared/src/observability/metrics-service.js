"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
exports.getMetricsService = getMetricsService;
const promClient = __importStar(require("prom-client"));
class MetricsService {
    registry;
    enabled;
    messagesProcessed;
    botTriggersTotal;
    botResponsesTotal;
    botResponseDuration;
    botErrorsTotal;
    activeBotsGauge;
    uniqueUsersGauge;
    constructor() {
        this.enabled = process.env.ENABLE_METRICS !== 'false';
        this.registry = new promClient.Registry();
        if (this.enabled) {
            promClient.collectDefaultMetrics({ register: this.registry });
        }
        this.messagesProcessed = new promClient.Counter({
            name: 'bunkbot_messages_processed_total',
            help: 'Total number of Discord messages processed',
            labelNames: ['guild_id', 'channel_id'],
            registers: [this.registry],
        });
        this.botTriggersTotal = new promClient.Counter({
            name: 'bunkbot_bot_triggers_total',
            help: 'Total number of bot triggers',
            labelNames: ['bot_name', 'trigger_name', 'guild_id', 'channel_id'],
            registers: [this.registry],
        });
        this.botResponsesTotal = new promClient.Counter({
            name: 'bunkbot_bot_responses_total',
            help: 'Total number of bot responses sent',
            labelNames: ['bot_name', 'guild_id', 'channel_id', 'status'],
            registers: [this.registry],
        });
        this.botResponseDuration = new promClient.Histogram({
            name: 'bunkbot_bot_response_duration_ms',
            help: 'Bot response latency in milliseconds',
            labelNames: ['bot_name', 'guild_id'],
            buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000],
            registers: [this.registry],
        });
        this.botErrorsTotal = new promClient.Counter({
            name: 'bunkbot_bot_errors_total',
            help: 'Total number of bot errors',
            labelNames: ['bot_name', 'error_type', 'guild_id'],
            registers: [this.registry],
        });
        this.activeBotsGauge = new promClient.Gauge({
            name: 'bunkbot_active_bots',
            help: 'Number of active bots loaded',
            registers: [this.registry],
        });
        this.uniqueUsersGauge = new promClient.Gauge({
            name: 'bunkbot_unique_users_interacting',
            help: 'Number of unique users who have triggered bots',
            labelNames: ['bot_name', 'guild_id'],
            registers: [this.registry],
        });
    }
    trackMessageProcessed(guildId, channelId) {
        if (!this.enabled)
            return;
        this.messagesProcessed.inc({ guild_id: guildId, channel_id: channelId });
    }
    trackBotTrigger(botName, triggerName, guildId, channelId) {
        if (!this.enabled)
            return;
        this.botTriggersTotal.inc({
            bot_name: botName,
            trigger_name: triggerName,
            guild_id: guildId,
            channel_id: channelId,
        });
    }
    trackBotResponse(botName, guildId, channelId, status) {
        if (!this.enabled)
            return;
        this.botResponsesTotal.inc({
            bot_name: botName,
            guild_id: guildId,
            channel_id: channelId,
            status,
        });
    }
    trackBotResponseDuration(botName, guildId, durationMs) {
        if (!this.enabled)
            return;
        this.botResponseDuration.observe({ bot_name: botName, guild_id: guildId }, durationMs);
    }
    trackBotError(botName, errorType, guildId) {
        if (!this.enabled)
            return;
        this.botErrorsTotal.inc({ bot_name: botName, error_type: errorType, guild_id: guildId });
    }
    setActiveBots(count) {
        if (!this.enabled)
            return;
        this.activeBotsGauge.set(count);
    }
    trackUniqueUser(botName, guildId, _userId) {
        if (!this.enabled)
            return;
        this.uniqueUsersGauge.inc({ bot_name: botName, guild_id: guildId });
    }
    async getMetrics() {
        return this.registry.metrics();
    }
    getRegistry() {
        return this.registry;
    }
}
exports.MetricsService = MetricsService;
let metricsInstance;
function getMetricsService() {
    if (!metricsInstance) {
        metricsInstance = new MetricsService();
    }
    return metricsInstance;
}
