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
exports.getStarbunkClient = void 0;
var discord_js_1 = require("discord.js");
var environment_1 = require("../environment");
var logger_1 = require("../services/logger");
var commandHandler_1 = require("./commandHandler");
var djCova_1 = require("./djCova");
var StarbunkClient = /** @class */ (function (_super) {
    __extends(StarbunkClient, _super);
    function StarbunkClient() {
        var _this = _super.call(this, {
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.MessageContent,
                discord_js_1.GatewayIntentBits.GuildVoiceStates
            ]
        }) || this;
        _this.bots = new discord_js_1.Collection();
        _this.voiceBots = new discord_js_1.Collection();
        _this.onReady = function () { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                try {
                    logger_1.logger.info("Logged in as ".concat((_a = this.user) === null || _a === void 0 ? void 0 : _a.tag));
                    logger_1.logger.info('Client initialization complete');
                }
                catch (error) {
                    logger_1.logger.error('Error in ready event:', error instanceof Error ? error : new Error(String(error)));
                }
                return [2 /*return*/];
            });
        }); };
        _this.audioPlayer = new djCova_1.DJCova();
        _this.commandHandler = new commandHandler_1.CommandHandler();
        // Import bootstrapApplication dynamically to avoid circular dependency
        try {
            var bootstrapApplication = require('../services/bootstrap').bootstrapApplication;
            bootstrapApplication(_this).then(function () {
                logger_1.logger.info('Services bootstrapped successfully within StarbunkClient');
            }).catch(function (error) {
                logger_1.logger.error('Failed to bootstrap services within StarbunkClient:', error instanceof Error ? error : new Error(String(error)));
            });
        }
        catch (error) {
            logger_1.logger.error('Error importing or executing bootstrapApplication:', error instanceof Error ? error : new Error(String(error)));
        }
        _this.once(discord_js_1.Events.ClientReady, _this.onReady.bind(_this));
        _this.on(discord_js_1.Events.MessageCreate, _this.handleMessage.bind(_this));
        _this.on(discord_js_1.Events.InteractionCreate, _this.handleInteraction.bind(_this));
        _this.on(discord_js_1.Events.VoiceStateUpdate, _this.handleVoiceStateUpdate.bind(_this));
        _this.on('error', function (error) {
            logger_1.logger.error('Discord client error:', error);
        });
        _this.on('warn', function (warning) {
            logger_1.logger.warn('Discord client warning:', warning);
        });
        _this.on('debug', function (info) {
            logger_1.logger.debug('Discord client debug:', info);
        });
        return _this;
    }
    StarbunkClient.prototype.getMusicPlayer = function () {
        return this.audioPlayer;
    };
    StarbunkClient.prototype.handleMessage = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            var promises, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_1.logger.debug("Processing message \"".concat(message.content.substring(0, 100), "...\" through ").concat(this.bots.size, " bots"));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        promises = this.bots.map(function (bot) { return __awaiter(_this, void 0, void 0, function () {
                            var error_2;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        logger_1.logger.debug("Sending message to bot: ".concat(bot.defaultBotName));
                                        return [4 /*yield*/, bot.auditMessage(message)];
                                    case 1:
                                        _a.sent();
                                        logger_1.logger.debug("Bot ".concat(bot.defaultBotName, " finished processing message"));
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_2 = _a.sent();
                                        logger_1.logger.error("Error in bot ".concat(bot.defaultBotName, " while processing message:"), error_2 instanceof Error ? error_2 : new Error(String(error_2)));
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); });
                        return [4 /*yield*/, Promise.all(promises)];
                    case 2:
                        _a.sent();
                        logger_1.logger.debug('All bots finished processing message');
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        logger_1.logger.error('Error handling message across bots:', error_1 instanceof Error ? error_1 : new Error(String(error_1)));
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    StarbunkClient.prototype.handleVoiceStateUpdate = function (oldState, newState) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var promises, error_3;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        logger_1.logger.debug("Processing voice state update for user ".concat((_a = newState.member) === null || _a === void 0 ? void 0 : _a.user.tag));
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        promises = this.voiceBots.map(function (bot) { return __awaiter(_this, void 0, void 0, function () {
                            var error_4;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        logger_1.logger.debug("Sending voice state update to bot: ".concat(bot.constructor.name));
                                        return [4 /*yield*/, bot.onVoiceStateUpdate(oldState, newState)];
                                    case 1:
                                        _a.sent();
                                        logger_1.logger.debug("Bot ".concat(bot.constructor.name, " finished processing voice state update"));
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_4 = _a.sent();
                                        logger_1.logger.error("Error in bot ".concat(bot.constructor.name, " while processing voice state update:"), error_4 instanceof Error ? error_4 : new Error(String(error_4)));
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); });
                        return [4 /*yield*/, Promise.all(promises)];
                    case 2:
                        _b.sent();
                        logger_1.logger.debug('All voice bots finished processing voice state update');
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _b.sent();
                        logger_1.logger.error('Error handling voice state update across bots:', error_3 instanceof Error ? error_3 : new Error(String(error_3)));
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    StarbunkClient.prototype.handleInteraction = function (interaction) {
        return __awaiter(this, void 0, void 0, function () {
            var error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!interaction.isChatInputCommand())
                            return [2 /*return*/];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.commandHandler.handleInteraction(interaction)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_5 = _a.sent();
                        logger_1.logger.error('Error handling interaction:', error_5 instanceof Error ? error_5 : new Error(String(error_5)));
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    StarbunkClient.prototype.destroy = function () {
        logger_1.logger.info('Destroying StarbunkClient');
        try {
            // Call the parent destroy method from Client
            return _super.prototype.destroy.call(this);
        }
        catch (error) {
            logger_1.logger.error('Error destroying Discord client:', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    };
    StarbunkClient.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_1.logger.info('Initializing StarbunkClient');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        // Load bots and commands
                        return [4 /*yield*/, this.loadBots()];
                    case 2:
                        // Load bots and commands
                        _a.sent();
                        // Register commands with Discord
                        return [4 /*yield*/, this.commandHandler.registerCommands()];
                    case 3:
                        // Register commands with Discord
                        _a.sent();
                        logger_1.logger.info('StarbunkClient initialized successfully');
                        return [3 /*break*/, 5];
                    case 4:
                        error_6 = _a.sent();
                        logger_1.logger.error('Failed to initialize StarbunkClient:', error_6 instanceof Error ? error_6 : new Error(String(error_6)));
                        throw error_6;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    StarbunkClient.prototype.loadBots = function () {
        return __awaiter(this, void 0, void 0, function () {
            var isDebug, isTsNode, loadStrategyBots, strategyBots, error_7, loadVoiceBots, voiceBots, error_8, error_9;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_1.logger.info('Loading bots...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 9, , 10]);
                        isDebug = (0, environment_1.isDebugMode)();
                        // Debug more information about environment
                        if (isDebug) {
                            isTsNode = process.argv[0].includes('ts-node') ||
                                (process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('ts-node'));
                            logger_1.logger.debug("Running with ts-node: ".concat(isTsNode));
                            logger_1.logger.debug("Loading bots with: NODE_ENV=".concat(process.env.NODE_ENV, ", ts-node=").concat(isTsNode, ", __dirname=").concat(__dirname));
                            logger_1.logger.debug("Command: ".concat(process.argv.join(' ')));
                            if (process.env.npm_lifecycle_script) {
                                logger_1.logger.debug("npm script: ".concat(process.env.npm_lifecycle_script));
                            }
                        }
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        loadStrategyBots = require('./bots/strategy-loader').loadStrategyBots;
                        return [4 /*yield*/, loadStrategyBots()];
                    case 3:
                        strategyBots = _a.sent();
                        // Add strategy bots to the collection
                        strategyBots.forEach(function (bot) {
                            if (bot && typeof bot.defaultBotName === 'string') {
                                _this.bots.set(bot.defaultBotName, bot);
                                logger_1.logger.debug("Added strategy bot: ".concat(bot.defaultBotName));
                            }
                        });
                        // Show summary of all loaded strategy bots
                        if (this.bots.size > 0) {
                            logger_1.logger.info("\uD83D\uDCCA Successfully loaded ".concat(this.bots.size, " strategy bots"));
                            logger_1.logger.info('📋 Strategy bots summary:');
                            this.bots.forEach(function (bot, name) {
                                logger_1.logger.info("   - ".concat(name, " (").concat(bot.constructor.name, ")"));
                            });
                        }
                        else {
                            logger_1.logger.warn('⚠️ No strategy bots were loaded');
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_7 = _a.sent();
                        logger_1.logger.error('Error loading strategy bots:', error_7 instanceof Error ? error_7 : new Error(String(error_7)));
                        return [3 /*break*/, 5];
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        loadVoiceBots = require('./bots/voice-loader').loadVoiceBots;
                        return [4 /*yield*/, loadVoiceBots()];
                    case 6:
                        voiceBots = _a.sent();
                        // Add voice bots to the collection
                        voiceBots.forEach(function (bot) {
                            if (bot && typeof bot.name === 'string') {
                                _this.voiceBots.set(bot.name, bot);
                                logger_1.logger.debug("Added voice bot: ".concat(bot.name));
                            }
                        });
                        // Show summary of all loaded voice bots
                        if (this.voiceBots.size > 0) {
                            logger_1.logger.info("\uD83D\uDCCA Successfully loaded ".concat(this.voiceBots.size, " voice bots"));
                            logger_1.logger.info('📋 Voice bots summary:');
                            this.voiceBots.forEach(function (bot, name) {
                                logger_1.logger.info("   - ".concat(name, " (").concat(bot.constructor.name, ")"));
                            });
                        }
                        else {
                            logger_1.logger.warn('⚠️ No voice bots were loaded');
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        error_8 = _a.sent();
                        logger_1.logger.error('Error loading voice bots:', error_8 instanceof Error ? error_8 : new Error(String(error_8)));
                        return [3 /*break*/, 8];
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        error_9 = _a.sent();
                        logger_1.logger.error('Error loading bots:', error_9 instanceof Error ? error_9 : new Error(String(error_9)));
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    return StarbunkClient;
}(discord_js_1.Client));
exports.default = StarbunkClient;
var getStarbunkClient = function (base) {
    return base.client;
};
exports.getStarbunkClient = getStarbunkClient;
