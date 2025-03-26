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
exports.runStarbunkBot = void 0;
// Register module aliases for path resolution
// Import environment first to ensure environment variables are loaded
var discord_js_1 = require("discord.js");
var environment_1 = require("./environment");
var logger_1 = require("./services/logger");
var snowbunkClient_1 = require("./snowbunk/snowbunkClient");
var starbunkClient_1 = require("./starbunk/starbunkClient");
function runStarbunkBot() {
    return __awaiter(this, void 0, void 0, function () {
        var token, client_1, bootstrapApplication, error_1, error_2, error_3;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.logger.info('Starting Starbunk bot');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 11, , 12]);
                    token = environment_1.default.discord.STARBUNK_TOKEN;
                    logger_1.logger.debug('Creating StarbunkClient');
                    client_1 = new starbunkClient_1.default();
                    // Initialize the client
                    return [4 /*yield*/, client_1.init()];
                case 2:
                    // Initialize the client
                    _a.sent();
                    // Bootstrap application services
                    logger_1.logger.info('Bootstrapping application services');
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    bootstrapApplication = require('./services/bootstrap').bootstrapApplication;
                    return [4 /*yield*/, bootstrapApplication(client_1)];
                case 4:
                    _a.sent();
                    logger_1.logger.info('Application services bootstrapped successfully');
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    logger_1.logger.error('Failed to bootstrap application services:', error_1 instanceof Error ? error_1 : new Error(String(error_1)));
                    throw error_1;
                case 6:
                    // If we're in testing mode, don't try to connect to Discord
                    if ((0, environment_1.isDebugMode)()) {
                        logger_1.logger.info('Running in testing mode - skipping Discord login');
                        return [2 /*return*/];
                    }
                    // Log in to Discord
                    logger_1.logger.info('Logging in to Discord');
                    _a.label = 7;
                case 7:
                    _a.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, client_1.login(token)];
                case 8:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 9:
                    error_2 = _a.sent();
                    logger_1.logger.error('Failed to log in to Discord:', error_2 instanceof Error ? error_2 : new Error(String(error_2)));
                    client_1.destroy();
                    throw error_2;
                case 10:
                    // Handle process termination
                    process.on('SIGINT', function () { return __awaiter(_this, void 0, void 0, function () {
                        var error_4;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    logger_1.logger.info('Received SIGINT signal');
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, client_1.destroy()];
                                case 2:
                                    _a.sent();
                                    logger_1.logger.info('Bot shutdown complete');
                                    process.exit(0);
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_4 = _a.sent();
                                    logger_1.logger.error('Error during shutdown:', error_4 instanceof Error ? error_4 : new Error(String(error_4)));
                                    process.exit(1);
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); });
                    process.on('SIGTERM', function () { return __awaiter(_this, void 0, void 0, function () {
                        var error_5;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    logger_1.logger.info('Received SIGTERM signal');
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 4]);
                                    return [4 /*yield*/, client_1.destroy()];
                                case 2:
                                    _a.sent();
                                    logger_1.logger.info('Bot shutdown complete');
                                    process.exit(0);
                                    return [3 /*break*/, 4];
                                case 3:
                                    error_5 = _a.sent();
                                    logger_1.logger.error('Error during shutdown:', error_5 instanceof Error ? error_5 : new Error(String(error_5)));
                                    process.exit(1);
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); });
                    process.on('unhandledRejection', function (error) {
                        logger_1.logger.error('Unhandled promise rejection:', error);
                    });
                    process.on('uncaughtException', function (error) {
                        logger_1.logger.error('Uncaught exception:', error);
                        // Attempt graceful shutdown
                        client_1.destroy().finally(function () { return process.exit(1); });
                    });
                    logger_1.logger.info('Bot startup complete');
                    return [3 /*break*/, 12];
                case 11:
                    error_3 = _a.sent();
                    logger_1.logger.error('Fatal error during bot startup:', error_3 instanceof Error ? error_3 : new Error(String(error_3)));
                    throw error_3;
                case 12: return [2 /*return*/];
            }
        });
    });
}
exports.runStarbunkBot = runStarbunkBot;
var runSnowbunkBot = function () { return __awaiter(void 0, void 0, void 0, function () {
    var logger, snowbunk, bootstrapApplication, error_6, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logger = require('./services/logger').logger;
                logger.info('Starting Snowbunk bot');
                snowbunk = new snowbunkClient_1.default({
                    intents: [
                        discord_js_1.GatewayIntentBits.Guilds,
                        discord_js_1.GatewayIntentBits.GuildMessages,
                        discord_js_1.GatewayIntentBits.MessageContent,
                        discord_js_1.GatewayIntentBits.GuildVoiceStates
                    ]
                });
                // Bootstrap application services
                logger.info('Bootstrapping application services for Snowbunk');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                bootstrapApplication = require('./services/bootstrap').bootstrapApplication;
                return [4 /*yield*/, bootstrapApplication(snowbunk)];
            case 2:
                _a.sent();
                logger.info('Snowbunk application services bootstrapped successfully');
                return [3 /*break*/, 4];
            case 3:
                error_6 = _a.sent();
                logger.error('Failed to bootstrap Snowbunk application services:', error_6 instanceof Error ? error_6 : new Error(String(error_6)));
                throw error_6;
            case 4:
                // If we're in testing mode, don't try to connect to Discord
                if ((0, environment_1.isDebugMode)()) {
                    logger.info('Running in testing mode - skipping Snowbunk Discord login');
                    return [2 /*return*/];
                }
                _a.label = 5;
            case 5:
                _a.trys.push([5, 7, , 8]);
                return [4 /*yield*/, snowbunk.login(environment_1.default.discord.SNOWBUNK_TOKEN)];
            case 6:
                _a.sent();
                return [3 /*break*/, 8];
            case 7:
                error_7 = _a.sent();
                logger.error('Failed to log in to Discord with Snowbunk:', error_7 instanceof Error ? error_7 : new Error(String(error_7)));
                throw error_7;
            case 8: return [2 /*return*/];
        }
    });
}); };
var runBots = function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, Promise.all([
                        runStarbunkBot().catch(function (error) {
                            console.error('Starbunk Error:', error);
                            throw error;
                        }),
                        runSnowbunkBot().catch(function (error) {
                            console.error('Snowbunk Error:', error);
                            throw error;
                        })
                    ])];
            case 1:
                _a.sent();
                return [3 /*break*/, 3];
            case 2:
                error_8 = _a.sent();
                console.error('Failed to start bots:', error_8);
                process.exit(1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); };
runBots().then();
