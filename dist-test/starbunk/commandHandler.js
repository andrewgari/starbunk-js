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
exports.CommandHandler = void 0;
var discord_js_1 = require("discord.js");
var fs_1 = require("fs");
var path_1 = require("path");
var environment_1 = require("../environment");
var logger_1 = require("../services/logger");
var moduleLoader_1 = require("../util/moduleLoader");
var CommandHandler = /** @class */ (function () {
    function CommandHandler() {
        this.commands = new discord_js_1.Collection();
        logger_1.logger.info('Initializing CommandHandler');
    }
    CommandHandler.prototype.registerCommands = function () {
        return __awaiter(this, void 0, void 0, function () {
            var usePlaceholderCommands, isDev, isDebug, isTsNode, devExtension, prodExtension, fileExtension_1, baseDir, commandDir_1, commandFiles, successCount_1, _loop_1, this_1, _i, commandFiles_1, commandFile, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        usePlaceholderCommands = false;
                        if (usePlaceholderCommands) {
                            logger_1.logger.warn('Using placeholder commands due to module loading issues');
                            logger_1.logger.info("Loaded 0 commands successfully");
                            return [2 /*return*/];
                        }
                        logger_1.logger.info('Loading commands...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 9, , 10]);
                        isDev = process.env.NODE_ENV === 'development';
                        isDebug = (0, environment_1.isDebugMode)();
                        // Setting TS_NODE_DEV for path resolution in TypeScript modules
                        if (isDev) {
                            process.env.TS_NODE_DEV = 'true';
                        }
                        isTsNode = process.argv[0].includes('ts-node') ||
                            (process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('ts-node'));
                        logger_1.logger.debug("Running with ts-node: ".concat(isTsNode));
                        // Debug more information about environment
                        if (isDebug) {
                            logger_1.logger.debug("Loading commands with: NODE_ENV=".concat(process.env.NODE_ENV, ", ts-node=").concat(isTsNode, ", __dirname=").concat(__dirname));
                            logger_1.logger.debug("Command: ".concat(process.argv.join(' ')));
                            if (process.env.npm_lifecycle_script) {
                                logger_1.logger.debug("npm script: ".concat(process.env.npm_lifecycle_script));
                            }
                        }
                        devExtension = '.ts';
                        prodExtension = '.js';
                        fileExtension_1 = (isDev || isTsNode) ? devExtension : prodExtension;
                        baseDir = (isDev || isTsNode) ? './src' : './dist';
                        commandDir_1 = path_1.default.resolve("".concat(baseDir, "/starbunk/commands"));
                        logger_1.logger.debug("Looking for commands in: ".concat(commandDir_1));
                        logger_1.logger.info("Running in ".concat(isDev ? 'development' : 'production', " mode, looking for ").concat(fileExtension_1, " files"));
                        commandFiles = fs_1.default.readdirSync(commandDir_1)
                            .filter(function (file) { return file.endsWith(fileExtension_1) && !file.endsWith('.d.ts') && !file.endsWith('adapter.ts'); })
                            .map(function (file) { return path_1.default.join(commandDir_1, file); });
                        logger_1.logger.info("Found ".concat(commandFiles.length, " command files to load: ").concat(commandFiles.map(function (f) { return path_1.default.basename(f); }).join(', ')));
                        successCount_1 = 0;
                        _loop_1 = function (commandFile) {
                            var command, commandModule, errorMessage, filePath_1, error_2;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _b.trys.push([0, 2, , 3]);
                                        logger_1.logger.info("Loading command from file: ".concat(path_1.default.basename(commandFile)));
                                        command = null;
                                        // Try direct require first which works better in our diagnostic script
                                        try {
                                            logger_1.logger.info("Attempting direct require for ".concat(path_1.default.basename(commandFile)));
                                            commandModule = require(commandFile.replace(/\.ts$/, ''));
                                            if (commandModule) {
                                                // Check if it's a direct command object
                                                if (commandModule.data && commandModule.execute) {
                                                    command = commandModule;
                                                }
                                                // Check if it's in the default export
                                                else if (commandModule.default && commandModule.default.data && commandModule.default.execute) {
                                                    command = commandModule.default;
                                                }
                                                if (command) {
                                                    this_1.registerCommand(command);
                                                    logger_1.logger.info("\u2705 Command loaded successfully via require: ".concat(command.data.name));
                                                    successCount_1++;
                                                    return [2 /*return*/, "continue"];
                                                }
                                                else {
                                                    logger_1.logger.warn("\u26A0\uFE0F No valid command found in module: ".concat(path_1.default.basename(commandFile)));
                                                }
                                            }
                                            else {
                                                logger_1.logger.warn("\u26A0\uFE0F No module loaded from require: ".concat(path_1.default.basename(commandFile)));
                                            }
                                        }
                                        catch (requireError) {
                                            errorMessage = requireError instanceof Error
                                                ? requireError.message
                                                : 'Unknown error';
                                            logger_1.logger.warn("\u26A0\uFE0F Direct require failed for ".concat(path_1.default.basename(commandFile), ": ").concat(errorMessage));
                                            // Continue to try the loadCommand utility
                                        }
                                        return [4 /*yield*/, (0, moduleLoader_1.loadCommand)(commandFile)];
                                    case 1:
                                        // Fall back to loadCommand utility
                                        command = _b.sent();
                                        if (command) {
                                            this_1.registerCommand(command);
                                            logger_1.logger.info("\u2705 Command loaded successfully via loadCommand: ".concat(command.data.name));
                                            successCount_1++;
                                        }
                                        else {
                                            // Final fallback: use an import statement
                                            try {
                                                // For .ts files specifically in development
                                                if (isDev && commandFile.endsWith('.ts')) {
                                                    filePath_1 = path_1.default.basename(commandFile);
                                                    logger_1.logger.info("Attempting dynamic import for: ".concat(filePath_1));
                                                    // This is the last attempt to load the command
                                                    Promise.resolve("".concat("../starbunk/commands/".concat(filePath_1.replace(/\.ts$/, '')))).then(function (s) { return require(s); }).then(function (module) {
                                                        var cmd = module.default;
                                                        if (cmd && cmd.data && cmd.execute) {
                                                            _this.registerCommand(cmd);
                                                            logger_1.logger.info("\u2705 Command loaded successfully via import(): ".concat(cmd.data.name));
                                                            successCount_1++;
                                                        }
                                                        else {
                                                            logger_1.logger.warn("\u26A0\uFE0F No valid command found in module via import(): ".concat(filePath_1));
                                                        }
                                                    }).catch(function (err) {
                                                        logger_1.logger.warn("\u26A0\uFE0F Dynamic import failed for ".concat(filePath_1, ": ").concat(err.message));
                                                    });
                                                }
                                                else {
                                                    logger_1.logger.warn("\u26A0\uFE0F No command object returned from: ".concat(commandFile));
                                                }
                                            }
                                            catch (importError) {
                                                logger_1.logger.warn("\u26A0\uFE0F Final import attempt failed for ".concat(path_1.default.basename(commandFile), ": ").concat(importError instanceof Error ? importError.message : String(importError)));
                                            }
                                        }
                                        return [3 /*break*/, 3];
                                    case 2:
                                        error_2 = _b.sent();
                                        logger_1.logger.error("\u274C Failed to load command: ".concat(commandFile), error_2 instanceof Error ? error_2 : new Error(String(error_2)));
                                        return [3 /*break*/, 3];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, commandFiles_1 = commandFiles;
                        _a.label = 2;
                    case 2:
                        if (!(_i < commandFiles_1.length)) return [3 /*break*/, 5];
                        commandFile = commandFiles_1[_i];
                        return [5 /*yield**/, _loop_1(commandFile)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        logger_1.logger.info("\uD83D\uDCCA Successfully loaded ".concat(successCount_1, " out of ").concat(commandFiles.length, " commands"));
                        if (!(successCount_1 > 0)) return [3 /*break*/, 7];
                        // Register commands with Discord API
                        return [4 /*yield*/, this.registerDiscordCommands()];
                    case 6:
                        // Register commands with Discord API
                        _a.sent();
                        logger_1.logger.info('Commands registered successfully');
                        return [3 /*break*/, 8];
                    case 7:
                        logger_1.logger.warn('No commands were loaded, skipping Discord API registration');
                        _a.label = 8;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        error_1 = _a.sent();
                        logger_1.logger.error('Error loading commands:', error_1 instanceof Error ? error_1 : new Error(String(error_1)));
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.registerDiscordCommands = function () {
        return __awaiter(this, void 0, void 0, function () {
            var token, rest, commandData_1, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        if (!process.env.CLIENT_ID) {
                            throw new Error('CLIENT_ID not set in environment variables');
                        }
                        if (!process.env.GUILD_ID) {
                            throw new Error('GUILD_ID not set in environment variables');
                        }
                        token = process.env.STARBUNK_TOKEN || process.env.TOKEN || '';
                        rest = new discord_js_1.REST({ version: '9' }).setToken(token);
                        commandData_1 = [];
                        // Collect all command data, converting SlashCommandBuilder to JSON if needed
                        this.commands.forEach(function (command) {
                            if (!command.data)
                                return;
                            // If the command data is a SlashCommandBuilder or has toJSON method
                            if (typeof command.data === 'object' && 'toJSON' in command.data && typeof command.data.toJSON === 'function') {
                                commandData_1.push(command.data.toJSON());
                            }
                            else {
                                // Plain object data
                                commandData_1.push(command.data);
                            }
                        });
                        logger_1.logger.debug("Registering ".concat(commandData_1.length, " commands with Discord API"));
                        logger_1.logger.debug("Command data: ".concat(JSON.stringify(commandData_1.map(function (cmd) { return cmd.name; }))));
                        if (!(commandData_1.length > 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, rest.put(discord_js_1.Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commandData_1 })];
                    case 1:
                        _a.sent();
                        logger_1.logger.info('Successfully registered application commands with Discord');
                        return [3 /*break*/, 3];
                    case 2:
                        logger_1.logger.warn('No commands to register with Discord');
                        _a.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        error_3 = _a.sent();
                        logger_1.logger.error('Error registering commands with Discord:', error_3 instanceof Error ? error_3 : new Error(String(error_3)));
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    CommandHandler.prototype.registerCommand = function (command) {
        var _a;
        var commandName = ((_a = command.data) === null || _a === void 0 ? void 0 : _a.name) || 'unknown';
        logger_1.logger.debug("Registering command: ".concat(commandName));
        this.commands.set(commandName, command);
    };
    CommandHandler.prototype.handleInteraction = function (interaction) {
        return __awaiter(this, void 0, void 0, function () {
            var commandName, command, error_4, errorMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        commandName = interaction.commandName;
                        command = this.commands.get(commandName);
                        if (!command) {
                            logger_1.logger.warn("Command ".concat(commandName, " not found"));
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 8]);
                        logger_1.logger.debug("Executing command: ".concat(commandName));
                        return [4 /*yield*/, command.execute(interaction)];
                    case 2:
                        _a.sent();
                        logger_1.logger.debug("Command ".concat(commandName, " executed successfully"));
                        return [3 /*break*/, 8];
                    case 3:
                        error_4 = _a.sent();
                        logger_1.logger.error("Error executing command ".concat(commandName, ":"), error_4 instanceof Error ? error_4 : new Error(String(error_4)));
                        errorMessage = 'There was an error executing this command.';
                        if (!(interaction.replied || interaction.deferred)) return [3 /*break*/, 5];
                        return [4 /*yield*/, interaction.followUp({ content: errorMessage, ephemeral: true })];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 5: return [4 /*yield*/, interaction.reply({ content: errorMessage, ephemeral: true })];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    return CommandHandler;
}());
exports.CommandHandler = CommandHandler;
