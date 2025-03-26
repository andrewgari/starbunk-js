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
var discordService_1 = require("@/services/discordService");
var logger_1 = require("../../services/logger");
var random_1 = require("../../utils/random");
var ReplyBot = /** @class */ (function () {
    function ReplyBot() {
        this.skipBotMessages = true;
        this.responseRate = 100; // Default to 100% response rate
    }
    Object.defineProperty(ReplyBot.prototype, "defaultBotName", {
        /**
         * Get the default name for this bot. By default, returns the class name.
         * Can be overridden if a different name is needed.
         */
        get: function () {
            return this.constructor.name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(ReplyBot.prototype, "description", {
        /**
         * Get the description for this bot.
         * Should be overridden by child classes to provide a meaningful description.
         */
        get: function () {
            return "A Starbunk reply bot";
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Set the response rate for this bot.
     * @param rate The response rate (0-100)
     * @throws Error if rate is invalid
     */
    ReplyBot.prototype.setResponseRate = function (rate) {
        if (rate < 0 || rate > 100) {
            throw new Error("Invalid response rate: ".concat(rate, ". Must be between 0 and 100."));
        }
        this.responseRate = rate;
    };
    /**
     * Get the current response rate for this bot.
     * @returns The response rate (0-100)
     */
    ReplyBot.prototype.getResponseRate = function () {
        return this.responseRate;
    };
    ReplyBot.prototype.auditMessage = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_1.logger.debug("[".concat(this.defaultBotName, "] Auditing message from ").concat(message.author.tag));
                        // Early return if message should be skipped
                        if (this.shouldSkipMessage(message)) {
                            logger_1.logger.debug("[".concat(this.defaultBotName, "] Skipping message from ").concat(message.author.tag, " (shouldSkipMessage=true)"));
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.handleMessage(message)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        logger_1.logger.error("[".concat(this.defaultBotName, "] Error handling message"), error_1);
                        logger_1.logger.debug("[".concat(this.defaultBotName, "] Message content that caused error: \"").concat(message.content.substring(0, 100), "...\""));
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Determines if a message should be skipped based on bot settings.
     * Can be overridden by child classes for custom skip logic.
     */
    ReplyBot.prototype.shouldSkipMessage = function (message) {
        return this.skipBotMessages && message.author.bot;
    };
    /**
     * Determines if the bot should respond based on its response rate.
     * Will always return true in debug mode.
     */
    ReplyBot.prototype.shouldTriggerResponse = function () {
        var shouldTrigger = (0, random_1.percentChance)(this.responseRate);
        logger_1.logger.debug("[".concat(this.defaultBotName, "] Response rate check (").concat(this.responseRate, "%): ").concat(shouldTrigger));
        return shouldTrigger;
    };
    /**
     * Main message handling method. This should not be overridden by child classes.
     * Instead, override processMessage() for custom handling logic.
     */
    ReplyBot.prototype.handleMessage = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        if (this.shouldSkipMessage(message)) {
                            logger_1.logger.debug("[".concat(this.defaultBotName, "] Skipping message from ").concat(message.author.tag, " (shouldSkipMessage=true)"));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.processMessage(message)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_2 = _a.sent();
                        logger_1.logger.error("[".concat(this.defaultBotName, "] Error in handleMessage:"), error_2);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Sends a reply to the specified channel using the bot's identity.
     */
    ReplyBot.prototype.sendReply = function (channel, content) {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, discordService_1.DiscordService.getInstance().sendMessageWithBotIdentity(channel.id, this.botIdentity, content)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_3 = _a.sent();
                        logger_1.logger.error("[".concat(this.defaultBotName, "] Error sending reply:"), error_3);
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    ReplyBot.prototype.isSelf = function (message) {
        var _a;
        var isSelf = message.author.bot && message.author.id === ((_a = message.client.user) === null || _a === void 0 ? void 0 : _a.id);
        logger_1.logger.debug("[".concat(this.defaultBotName, "] Checking if message is from self: ").concat(isSelf));
        return isSelf;
    };
    ReplyBot.prototype.isBot = function (message) {
        var isBot = message.author.bot;
        logger_1.logger.debug("[".concat(this.defaultBotName, "] Checking if message is from bot: ").concat(isBot));
        return isBot;
    };
    return ReplyBot;
}());
exports.default = ReplyBot;
