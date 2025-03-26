"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var discord_js_1 = require("discord.js");
var discordClient_1 = require("../discord/discordClient");
var userId_1 = require("../discord/userId");
var bootstrap_1 = require("../services/bootstrap");
var SnowbunkClient = /** @class */ (function (_super) {
    __extends(SnowbunkClient, _super);
    function SnowbunkClient() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.channelMap = {
            '757866614787014660': ['856617421942030364', '798613445301633137'],
            // testing
            '856617421942030364': ['757866614787014660', '798613445301633137'],
            // testing
            '798613445301633137': ['757866614787014660', '856617421942030364'],
            // starbunk
            '755579237934694420': ['755585038388691127'],
            // starbunk
            '755585038388691127': ['755579237934694420'],
            // memes
            '753251583084724371': ['697341904873979925'],
            // memes
            '697341904873979925': ['753251583084724371'],
            // ff14 general
            '754485972774944778': ['696906700627640352'],
            // ff14 general
            '696906700627640352': ['754485972774944778'],
            // ff14 msq
            '697342576730177658': ['753251583084724372'],
            // ff14 msq
            '753251583084724372': ['697342576730177658'],
            // screenshots
            '753251583286050926': ['755575759753576498'],
            // screenshots
            '755575759753576498': ['753251583286050926'],
            // raiding
            '753251583286050928': ['699048771308224642'],
            // raiding
            '699048771308224642': ['753251583286050928'],
            // food
            '696948268579553360': ['755578695011270707'],
            // food
            '755578695011270707': ['696948268579553360'],
            // pets
            '696948305586028544': ['755578835122126898'],
            // pets
            '755578835122126898': ['696948305586028544'],
        };
        _this.syncMessage = function (message) {
            if (message.author.id === userId_1.default.Goose)
                return;
            if (message.author.bot)
                return;
            var linkedChannels = _this.getSyncedChannels(message.channel.id);
            linkedChannels.forEach(function (channelID) {
                _this.channels
                    .fetch(channelID)
                    .then(function (channel) {
                    _this.writeMessage(message, channel);
                })
                    .catch(function (error) {
                    console.error(error);
                });
            });
        };
        return _this;
    }
    SnowbunkClient.prototype.getSyncedChannels = function (channelID) {
        var _a;
        return (_a = this.channelMap[channelID]) !== null && _a !== void 0 ? _a : [];
    };
    SnowbunkClient.prototype.bootstrap = function () {
        var _this = this;
        // Import bootstrapApplication dynamically to avoid circular dependency
        try {
            var bootstrapApplication = require('../services/bootstrap').bootstrapApplication;
            bootstrapApplication(this).then(function () {
                console.log('Services bootstrapped successfully within SnowbunkClient');
            }).catch(function (error) {
                console.error('Failed to bootstrap services within SnowbunkClient:', error instanceof Error ? error : new Error(String(error)));
            });
        }
        catch (error) {
            console.error('Error importing or executing bootstrapApplication:', error instanceof Error ? error : new Error(String(error)));
        }
        this.on(discord_js_1.Events.MessageCreate, function (message) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                this.syncMessage(message);
                return [2 /*return*/];
            });
        }); });
    };
    SnowbunkClient.prototype.writeMessage = function (message, linkedChannel) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        var userid = message.author.id;
        var displayName = (_d = (_b = (_a = linkedChannel.members.get(userid)) === null || _a === void 0 ? void 0 : _a.displayName) !== null && _b !== void 0 ? _b : (_c = message.member) === null || _c === void 0 ? void 0 : _c.displayName) !== null && _d !== void 0 ? _d : message.author.displayName;
        var avatarUrl = (_h = (_f = (_e = linkedChannel.members.get(userid)) === null || _e === void 0 ? void 0 : _e.avatarURL()) !== null && _f !== void 0 ? _f : (_g = message.member) === null || _g === void 0 ? void 0 : _g.avatarURL()) !== null && _h !== void 0 ? _h : message.author.defaultAvatarURL;
        try {
            // Try to use webhook service
            try {
                var webhookService = (0, bootstrap_1.getWebhookService)();
                webhookService.writeMessage(linkedChannel, {
                    username: displayName,
                    avatarURL: avatarUrl,
                    content: message.content,
                    embeds: [],
                });
                return; // Success, exit early
            }
            catch (error) {
                // Just log the webhook error, we'll fall back to direct channel message
                console.warn("[SnowbunkClient] Failed to use webhook service, falling back to direct message: ".concat(error instanceof Error ? error.message : String(error)));
            }
            // Fallback to direct channel message
            console.debug("[SnowbunkClient] Sending fallback direct message to channel ".concat(linkedChannel.name));
            var formattedMessage = "**[".concat(displayName, "]**: ").concat(message.content);
            linkedChannel.send(formattedMessage);
        }
        catch (error) {
            console.error("[SnowbunkClient] Failed to send any message to channel ".concat(linkedChannel.id, ": ").concat(error instanceof Error ? error.message : String(error)));
            // Don't throw here - just log the error and continue
        }
    };
    return SnowbunkClient;
}(discordClient_1.default));
exports.default = SnowbunkClient;
