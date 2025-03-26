"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscordService = void 0;
var discord_js_1 = require("discord.js");
var guildIds_1 = require("@/discord/guildIds");
var discordErrors_1 = require("./errors/discordErrors");
// Singleton instance
var discordServiceInstance = null;
var DefaultGuildId = guildIds_1.default.StarbunkCrusaders;
var DiscordService = /** @class */ (function () {
    function DiscordService(client) {
        this.client = client;
        this.memberCache = new Map();
        this.channelCache = new Map();
        this.guildCache = new Map();
        this.roleCache = new Map();
        this.botProfileCache = new Map();
        this.webhookCache = new Map();
        this.botProfileRefreshInterval = null;
        this.startBotProfileRefresh();
    }
    DiscordService.prototype.getOrCreateWebhook = function (channel) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var cacheKey, cachedWebhook, webhooks, existingWebhook, newWebhook;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        cacheKey = channel.id;
                        cachedWebhook = this.webhookCache.get(cacheKey);
                        if (cachedWebhook) {
                            return [2 /*return*/, cachedWebhook];
                        }
                        return [4 /*yield*/, channel.fetchWebhooks()];
                    case 1:
                        webhooks = _b.sent();
                        existingWebhook = webhooks.find(function (w) { var _a, _b; return ((_a = w.owner) === null || _a === void 0 ? void 0 : _a.id) === ((_b = _this.client.user) === null || _b === void 0 ? void 0 : _b.id); });
                        if (existingWebhook) {
                            this.webhookCache.set(cacheKey, existingWebhook);
                            return [2 /*return*/, existingWebhook];
                        }
                        return [4 /*yield*/, channel.createWebhook({
                                name: 'Starbunk Bot',
                                avatar: (_a = this.client.user) === null || _a === void 0 ? void 0 : _a.displayAvatarURL()
                            })];
                    case 2:
                        newWebhook = _b.sent();
                        this.webhookCache.set(cacheKey, newWebhook);
                        return [2 /*return*/, newWebhook];
                }
            });
        });
    };
    DiscordService.prototype.startBotProfileRefresh = function () {
        var _this = this;
        // Initial refresh
        this.refreshBotProfiles().catch(function (error) {
            console.error('Failed to refresh bot profiles:', error);
        });
        // Set up hourly refresh
        this.botProfileRefreshInterval = setInterval(function () {
            _this.refreshBotProfiles().catch(function (error) {
                console.error('Failed to refresh bot profiles:', error);
            });
        }, 60 * 60 * 1000); // 1 hour
    };
    DiscordService.prototype.refreshBotProfiles = function () {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var guild, members, _i, members_1, member;
            return __generator(this, function (_c) {
                guild = this.getGuild(DefaultGuildId);
                members = Array.from(guild.members.cache.values());
                // Clear existing cache
                this.botProfileCache.clear();
                // Update cache with fresh data
                for (_i = 0, members_1 = members; _i < members_1.length; _i++) {
                    member = members_1[_i];
                    this.botProfileCache.set(member.id, {
                        botName: (_a = member.nickname) !== null && _a !== void 0 ? _a : member.user.username,
                        avatarUrl: (_b = member.displayAvatarURL()) !== null && _b !== void 0 ? _b : member.user.displayAvatarURL()
                    });
                }
                return [2 /*return*/];
            });
        });
    };
    DiscordService.prototype.getBotProfile = function (userId) {
        var profile = this.botProfileCache.get(userId);
        if (!profile) {
            // Fallback to direct fetch if not in cache
            return this.getMemberAsBotIdentity(userId);
        }
        return profile;
    };
    DiscordService.prototype.getRandomBotProfile = function () {
        var profiles = Array.from(this.botProfileCache.values());
        if (profiles.length === 0) {
            // Fallback to getting a random member's identity if cache is empty
            return this.getRandomMemberAsBotIdentity();
        }
        return profiles[Math.floor(Math.random() * profiles.length)];
    };
    /**
     * Initialize the Discord service singleton
     * @param client Discord.js client
     * @returns The DiscordService instance
     */
    DiscordService.initialize = function (client) {
        if (!discordServiceInstance) {
            discordServiceInstance = new DiscordService(client);
        }
        return discordServiceInstance;
    };
    /**
     * Get the Discord service instance. Must call initialize first.
     * @returns The DiscordService instance
     * @throws Error if the service hasn't been initialized
     */
    DiscordService.getInstance = function () {
        if (!discordServiceInstance) {
            throw new Error("DiscordService not initialized. Call initialize() first.");
        }
        return discordServiceInstance;
    };
    // Clear all caches
    DiscordService.prototype.clearCache = function () {
        this.memberCache.clear();
        this.channelCache.clear();
        this.guildCache.clear();
        this.roleCache.clear();
        this.webhookCache.clear();
    };
    DiscordService.prototype.sendMessage = function (channelId, message) {
        var channel = this.getTextChannel(channelId);
        return channel.send(message);
    };
    DiscordService.prototype.sendMessageWithBotIdentity = function (channelId, botIdentity, message) {
        return __awaiter(this, void 0, void 0, function () {
            var channel, webhook;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        channel = this.getTextChannel(channelId);
                        return [4 /*yield*/, this.getOrCreateWebhook(channel)];
                    case 1:
                        webhook = _a.sent();
                        return [4 /*yield*/, webhook.send({
                                content: message,
                                username: botIdentity.botName,
                                avatarURL: botIdentity.avatarUrl
                            })];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DiscordService.prototype.sendBulkMessages = function (options) {
        var results = [];
        for (var _i = 0, _a = options.channelIds; _i < _a.length; _i++) {
            var channelId = _a[_i];
            try {
                if (options.botIdentity) {
                    this.sendMessageWithBotIdentity(channelId, options.botIdentity, options.message);
                }
                else {
                    var message = this.sendMessage(channelId, options.message);
                    results.push(message);
                }
            }
            catch (error) {
                console.error("Failed to send message to channel ".concat(channelId, ":"), error);
            }
        }
        return results;
    };
    DiscordService.prototype.getUser = function (userId) {
        var user = this.client.users.cache.get(userId);
        if (!user) {
            throw new discordErrors_1.UserNotFoundError(userId);
        }
        return user;
    };
    DiscordService.prototype.getMember = function (guildId, memberId) {
        var _a;
        var cacheKey = "".concat(guildId, ":").concat(memberId);
        if (this.memberCache.has(cacheKey)) {
            return this.memberCache.get(cacheKey);
        }
        var member = (_a = this.client.guilds.cache.get(guildId)) === null || _a === void 0 ? void 0 : _a.members.cache.get(memberId);
        if (!member) {
            throw new discordErrors_1.MemberNotFoundError(memberId);
        }
        // Cache the result
        this.memberCache.set(cacheKey, member);
        return member;
    };
    DiscordService.prototype.getMemberByUsername = function (guildId, username) {
        var _a;
        var member = (_a = this.client.guilds.cache.get(guildId)) === null || _a === void 0 ? void 0 : _a.members.cache.find(function (m) { return m.user.username === username; });
        if (!member) {
            throw new discordErrors_1.MemberNotFoundError(username);
        }
        return member;
    };
    DiscordService.prototype.getRandomMember = function (guildId) {
        if (guildId === void 0) { guildId = DefaultGuildId; }
        var members = this.getMembersWithRole(guildId, "member");
        return members[Math.floor(Math.random() * members.length)];
    };
    DiscordService.prototype.getMemberAsBotIdentity = function (userId) {
        var _a, _b;
        var member = this.getMember(DefaultGuildId, userId);
        return {
            botName: (_a = member.nickname) !== null && _a !== void 0 ? _a : member.user.username,
            avatarUrl: (_b = member.displayAvatarURL()) !== null && _b !== void 0 ? _b : member.user.displayAvatarURL()
        };
    };
    DiscordService.prototype.getRandomMemberAsBotIdentity = function () {
        var _a, _b;
        var member = this.getRandomMember();
        return {
            botName: (_a = member.nickname) !== null && _a !== void 0 ? _a : member.user.username,
            avatarUrl: (_b = member.displayAvatarURL()) !== null && _b !== void 0 ? _b : member.user.displayAvatarURL()
        };
    };
    DiscordService.prototype.getTextChannel = function (channelId) {
        if (this.channelCache.has(channelId)) {
            var channel_1 = this.channelCache.get(channelId);
            if (channel_1 instanceof discord_js_1.TextChannel) {
                return channel_1;
            }
        }
        var channel = this.client.channels.cache.get(channelId);
        if (!channel) {
            throw new discordErrors_1.ChannelNotFoundError(channelId);
        }
        if (!(channel instanceof discord_js_1.TextChannel)) {
            throw new discordErrors_1.DiscordServiceError("Channel ".concat(channelId, " is not a text channel"));
        }
        this.channelCache.set(channelId, channel);
        return channel;
    };
    DiscordService.prototype.getVoiceChannel = function (channelId) {
        if (this.channelCache.has(channelId)) {
            var channel_2 = this.channelCache.get(channelId);
            if (channel_2 instanceof discord_js_1.VoiceChannel) {
                return channel_2;
            }
        }
        var channel = this.client.channels.cache.get(channelId);
        if (!channel) {
            throw new discordErrors_1.ChannelNotFoundError(channelId);
        }
        if (!(channel instanceof discord_js_1.VoiceChannel)) {
            throw new discordErrors_1.DiscordServiceError("Channel ".concat(channelId, " is not a voice channel"));
        }
        this.channelCache.set(channelId, channel);
        return channel;
    };
    DiscordService.prototype.getVoiceChannelFromMessage = function (message) {
        return this.getVoiceChannel(message.channel.id);
    };
    DiscordService.prototype.getGuild = function (guildId) {
        if (this.guildCache.has(guildId)) {
            return this.guildCache.get(guildId);
        }
        var guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
            throw new discordErrors_1.GuildNotFoundError(guildId);
        }
        this.guildCache.set(guildId, guild);
        return guild;
    };
    DiscordService.prototype.getRole = function (guildId, roleId) {
        var _a;
        var cacheKey = "".concat(guildId, ":").concat(roleId);
        if (this.roleCache.has(cacheKey)) {
            return this.roleCache.get(cacheKey);
        }
        var role = (_a = this.client.guilds.cache.get(guildId)) === null || _a === void 0 ? void 0 : _a.roles.cache.get(roleId);
        if (!role) {
            throw new discordErrors_1.RoleNotFoundError(roleId);
        }
        this.roleCache.set(cacheKey, role);
        return role;
    };
    DiscordService.prototype.getMembersWithRole = function (guildId, roleId) {
        var guild = this.getGuild(guildId);
        return Array.from(guild.members.cache.values())
            .filter(function (m) { return m.roles.cache.has(roleId); })
            .map(function (m) { return m; });
    };
    DiscordService.prototype.addReaction = function (messageId, channelId, emoji) {
        var channel = this.getTextChannel(channelId);
        var message = channel.messages.cache.get(messageId);
        if (!message) {
            throw new Error("Message ".concat(messageId, " not found in channel ").concat(channelId));
        }
        return message.react(emoji);
    };
    DiscordService.prototype.removeReaction = function (messageId, channelId, emoji) {
        var channel = this.getTextChannel(channelId);
        var message = channel.messages.cache.get(messageId);
        if (!message) {
            throw new Error("Message ".concat(messageId, " not found in channel ").concat(channelId));
        }
        var userReactions = message.reactions.cache.get(emoji);
        if (userReactions) {
            var botUser = this.client.user;
            if (botUser) {
                userReactions.users.remove(botUser.id);
            }
        }
    };
    DiscordService.prototype.isBunkBotMessage = function (message) {
        var _a;
        return message.author.bot && message.author.id === ((_a = this.client.user) === null || _a === void 0 ? void 0 : _a.id);
    };
    // Cleanup on service shutdown
    DiscordService.prototype.cleanup = function () {
        if (this.botProfileRefreshInterval) {
            clearInterval(this.botProfileRefreshInterval);
            this.botProfileRefreshInterval = null;
        }
        this.clearCache();
    };
    return DiscordService;
}());
exports.DiscordService = DiscordService;
