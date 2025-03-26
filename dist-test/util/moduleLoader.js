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
exports.debugModuleLoading = exports.scanDirectory = exports.loadCommand = exports.loadBot = exports.loadModule = void 0;
var environment_1 = require("@/environment");
var fs_1 = require("fs");
var path_1 = require("path");
var url_1 = require("url");
var logger_1 = require("../services/logger");
/**
 * Resolves a module path with support for path aliases
 */
function resolveModulePath(modulePath) {
    // Handle TypeScript path aliases
    if (modulePath.includes('@/')) {
        // Convert @/ paths to relative paths
        return modulePath.replace('@/', "".concat(process.cwd(), "/src/"));
    }
    return modulePath;
}
/**
 * Loads either TypeScript or JavaScript modules depending on environment
 * Works with both ESM and CommonJS modules
 */
function loadModule(modulePath) {
    return __awaiter(this, void 0, void 0, function () {
        var resolvedModulePath, module_1, error_1, module_2, fileUrl, module_3, error_2, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    logger_1.logger.info("Attempting to load module: ".concat(modulePath));
                    if (!(process.env.TS_NODE_DEV === 'true' && modulePath.endsWith('.ts'))) return [3 /*break*/, 4];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    resolvedModulePath = (0, url_1.pathToFileURL)(resolveModulePath(modulePath)).href;
                    logger_1.logger.debug("Using dynamic import with resolved path: ".concat(resolvedModulePath));
                    return [4 /*yield*/, Promise.resolve("".concat(resolvedModulePath)).then(function (s) { return require(s); })];
                case 2:
                    module_1 = _a.sent();
                    logger_1.logger.debug("Successfully imported module dynamically: ".concat(modulePath));
                    return [2 /*return*/, module_1];
                case 3:
                    error_1 = _a.sent();
                    logger_1.logger.error("Failed to dynamic import module: ".concat(modulePath), error_1 instanceof Error ? error_1 : new Error(String(error_1)));
                    return [3 /*break*/, 4];
                case 4:
                    // For JavaScript files or when TS_NODE_DEV is not set
                    try {
                        // Load with require (works for compiled JS)
                        logger_1.logger.debug("Using require for module: ".concat(modulePath));
                        module_2 = require(modulePath);
                        logger_1.logger.debug("Successfully required module: ".concat(modulePath));
                        return [2 /*return*/, module_2];
                    }
                    catch (error) {
                        logger_1.logger.error("Failed to require module: ".concat(modulePath), error instanceof Error ? error : new Error(String(error)));
                    }
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    fileUrl = (0, url_1.pathToFileURL)(modulePath).href;
                    logger_1.logger.debug("Trying dynamic import as last resort: ".concat(fileUrl));
                    return [4 /*yield*/, Promise.resolve("".concat(fileUrl)).then(function (s) { return require(s); })];
                case 6:
                    module_3 = _a.sent();
                    logger_1.logger.debug("Successfully imported module as last resort: ".concat(modulePath));
                    return [2 /*return*/, module_3];
                case 7:
                    error_2 = _a.sent();
                    logger_1.logger.error("Failed to load module ".concat(modulePath, ":"), error_2 instanceof Error ? error_2 : new Error(String(error_2)));
                    return [2 /*return*/, null];
                case 8: return [3 /*break*/, 10];
                case 9:
                    error_3 = _a.sent();
                    logger_1.logger.error("Failed to load module ".concat(modulePath, ":"), error_3 instanceof Error ? error_3 : new Error(String(error_3)));
                    return [2 /*return*/, null];
                case 10: return [2 /*return*/];
            }
        });
    });
}
exports.loadModule = loadModule;
/**
 * Loads a bot from file and ensures it has the correct interface
 */
function loadBot(botPath) {
    return __awaiter(this, void 0, void 0, function () {
        var module_4, BotClass, instance, moduleWithDefault, error_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    logger_1.logger.info("Attempting to load bot: ".concat(botPath));
                    return [4 /*yield*/, loadModule(botPath)];
                case 1:
                    module_4 = _a.sent();
                    // Check if module is a valid bot
                    if (!module_4) {
                        logger_1.logger.warn("No module loaded from: ".concat(botPath));
                        return [2 /*return*/, null];
                    }
                    // Log module structure for debugging
                    logger_1.logger.debug("Bot module structure from ".concat(path_1.default.basename(botPath), ": ").concat(typeof module_4 === 'object' ?
                        (module_4 === null ? 'null' :
                            Object.keys(module_4).length > 0 ? "object with keys: ".concat(Object.keys(module_4).join(', ')) : 'empty object')
                        : typeof module_4));
                    // Case 1: Module is already a bot instance
                    if (isReplyBot(module_4)) {
                        logger_1.logger.debug("Bot in file ".concat(path_1.default.basename(botPath), " is already a bot instance"));
                        return [2 /*return*/, module_4];
                    }
                    BotClass = void 0;
                    instance = void 0;
                    // Case 2: Default export is a class constructor (typical TypeScript export default class)
                    if (typeof module_4 === 'function') {
                        try {
                            logger_1.logger.debug("Bot in file ".concat(path_1.default.basename(botPath), " is a function constructor, instantiating..."));
                            BotClass = module_4;
                            instance = new BotClass();
                            if (isReplyBot(instance)) {
                                logger_1.logger.info("Successfully instantiated bot from function constructor in ".concat(path_1.default.basename(botPath)));
                                return [2 /*return*/, instance];
                            }
                            else {
                                logger_1.logger.debug("Instance from function constructor does not implement ReplyBot interface: ".concat(Object.keys(instance).join(', ')));
                            }
                        }
                        catch (error) {
                            logger_1.logger.error("Failed to instantiate bot constructor from function in ".concat(botPath, ":"), error instanceof Error ? error : new Error(String(error)));
                        }
                    }
                    // Case 3: Module has a default property that is a class constructor
                    if (module_4 && typeof module_4 === 'object' && 'default' in module_4) {
                        moduleWithDefault = module_4;
                        // Log the type of default export
                        logger_1.logger.debug("Default export type: ".concat(typeof moduleWithDefault.default));
                        if (typeof moduleWithDefault.default === 'function') {
                            try {
                                logger_1.logger.debug("Bot in file ".concat(path_1.default.basename(botPath), " has a default export that is a constructor, instantiating..."));
                                BotClass = moduleWithDefault.default;
                                instance = new BotClass();
                                if (isReplyBot(instance)) {
                                    logger_1.logger.info("Successfully instantiated bot from default export in ".concat(path_1.default.basename(botPath)));
                                    return [2 /*return*/, instance];
                                }
                                else {
                                    logger_1.logger.debug("Instance from default export does not implement ReplyBot interface: ".concat(Object.keys(instance || {}).join(', ')));
                                }
                            }
                            catch (error) {
                                logger_1.logger.error("Failed to instantiate bot constructor from default export in ".concat(botPath, ":"), error instanceof Error ? error : new Error(String(error)));
                            }
                        }
                        // Check if default export is already an instance
                        if (isReplyBot(moduleWithDefault.default)) {
                            logger_1.logger.debug("Bot in file ".concat(path_1.default.basename(botPath), " has a default export that is already a bot instance"));
                            return [2 /*return*/, moduleWithDefault.default];
                        }
                    }
                    // We successfully loaded a module but couldn't find a bot constructor or instance
                    logger_1.logger.warn("Bot in file ".concat(path_1.default.basename(botPath), " was loaded but does not export a valid bot"));
                    logger_1.logger.warn("If you're using TypeScript, make sure you use \"export default class YourBot extends ReplyBot\"");
                    return [2 /*return*/, null];
                case 2:
                    error_4 = _a.sent();
                    logger_1.logger.error("Error loading bot from ".concat(botPath, ":"), error_4 instanceof Error ? error_4 : new Error(String(error_4)));
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.loadBot = loadBot;
/**
 * Helper to check if an object implements the ReplyBot interface
 */
function isReplyBot(obj) {
    if (obj === null || typeof obj !== 'object') {
        logger_1.logger.debug("Not a ReplyBot: object is null or not an object (type: ".concat(typeof obj, ")"));
        return false;
    }
    var possibleBot = obj;
    // Debug: Log the keys to help diagnose issues
    if ((0, environment_1.isDebugMode)()) {
        logger_1.logger.debug("Checking if object is ReplyBot. Keys: ".concat(Object.keys(possibleBot).join(', ')));
        // Check each required property and log the result
        logger_1.logger.debug("Has processMessage: ".concat('processMessage' in possibleBot));
        if ('processMessage' in possibleBot) {
            logger_1.logger.debug("processMessage type: ".concat(typeof possibleBot.processMessage));
        }
        logger_1.logger.debug("Has defaultBotName: ".concat('defaultBotName' in possibleBot));
        if ('defaultBotName' in possibleBot) {
            logger_1.logger.debug("defaultBotName type: ".concat(typeof possibleBot.defaultBotName));
        }
    }
    // Also check if it's an instance of ReplyBot using prototype chain
    var isReplyBotInstance = 'processMessage' in possibleBot &&
        typeof possibleBot.processMessage === 'function' &&
        'defaultBotName' in possibleBot &&
        typeof possibleBot.defaultBotName !== 'undefined';
    // For TypeScript classes, check if the constructor name indicates a bot
    var constructorIsBot = 'constructor' in possibleBot &&
        possibleBot.constructor &&
        typeof possibleBot.constructor === 'function' &&
        'name' in possibleBot.constructor &&
        typeof possibleBot.constructor.name === 'string' &&
        (possibleBot.constructor.name.includes('Bot') ||
            possibleBot.constructor.name.includes('bot'));
    if (constructorIsBot && !isReplyBotInstance) {
        logger_1.logger.debug("Object has Bot in constructor name but doesn't fully implement ReplyBot interface: ".concat(possibleBot.constructor.name));
    }
    return isReplyBotInstance;
}
/**
 * Loads a command from file and ensures it has the correct interface
 */
function loadCommand(commandPath) {
    return __awaiter(this, void 0, void 0, function () {
        var module_5, moduleWithDefault, moduleAsObj_1, fileName, potentialCommandNames, _i, potentialCommandNames_1, commandName, cmdObj, potentialCommands, _a, potentialCommands_1, cmdKey, cmdObj, potentialConstructors, _b, potentialConstructors_1, ctorKey, CommandClass, instance, CommandClass, instance, fileName_1, placeholderCommand, error_5;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, loadModule(commandPath)];
                case 1:
                    module_5 = _c.sent();
                    if (!module_5) {
                        return [2 /*return*/, null];
                    }
                    // Log the module structure for debugging
                    logger_1.logger.debug("Command module structure: ".concat(typeof module_5 === 'object' ?
                        (module_5 === null ? 'null' :
                            Object.keys(module_5).length > 0 ? "object with keys: ".concat(Object.keys(module_5).join(', ')) : 'empty object')
                        : typeof module_5));
                    // Case 1: Module is already a command object
                    if (isValidCommand(module_5)) {
                        logger_1.logger.debug("Command in file ".concat(path_1.default.basename(commandPath), " directly implements Command interface"));
                        return [2 /*return*/, module_5];
                    }
                    // Case 2: Default export is a command object
                    if (typeof module_5 === 'object' && module_5 !== null) {
                        moduleWithDefault = module_5;
                        if (moduleWithDefault.default) {
                            logger_1.logger.debug("Default export type: ".concat(typeof moduleWithDefault.default));
                            if (typeof moduleWithDefault.default === 'object') {
                                logger_1.logger.debug("Default export keys: ".concat(Object.keys(moduleWithDefault.default).join(', ')));
                            }
                            if (isValidCommand(moduleWithDefault.default)) {
                                logger_1.logger.debug("Command in file ".concat(path_1.default.basename(commandPath), " has a valid default export"));
                                return [2 /*return*/, moduleWithDefault.default];
                            }
                        }
                        moduleAsObj_1 = module_5;
                        fileName = path_1.default.basename(commandPath, path_1.default.extname(commandPath));
                        potentialCommandNames = [
                            fileName, // Standard name (e.g., ping.ts -> ping)
                            fileName.charAt(0).toUpperCase() + fileName.slice(1), // Capitalized (e.g., ping.ts -> Ping)
                            'command',
                            'Command',
                            fileName + 'Command', // e.g., ping.ts -> pingCommand
                            fileName.charAt(0).toUpperCase() + fileName.slice(1) + 'Command' // e.g., ping.ts -> PingCommand
                        ];
                        logger_1.logger.debug("Looking for commands with names: ".concat(potentialCommandNames.join(', ')));
                        // First try to find command by name matching the file name
                        for (_i = 0, potentialCommandNames_1 = potentialCommandNames; _i < potentialCommandNames_1.length; _i++) {
                            commandName = potentialCommandNames_1[_i];
                            if (commandName in moduleAsObj_1 && typeof moduleAsObj_1[commandName] === 'object' && moduleAsObj_1[commandName] !== null) {
                                cmdObj = moduleAsObj_1[commandName];
                                if (isValidCommand(cmdObj)) {
                                    logger_1.logger.debug("Found valid command in named export '".concat(commandName, "' in ").concat(path_1.default.basename(commandPath)));
                                    return [2 /*return*/, cmdObj];
                                }
                            }
                        }
                        potentialCommands = Object.keys(moduleAsObj_1)
                            .filter(function (key) { return typeof moduleAsObj_1[key] === 'object' && moduleAsObj_1[key] !== null; })
                            .filter(function (key) { return key !== 'default' && key !== '__esModule'; });
                        for (_a = 0, potentialCommands_1 = potentialCommands; _a < potentialCommands_1.length; _a++) {
                            cmdKey = potentialCommands_1[_a];
                            cmdObj = moduleAsObj_1[cmdKey];
                            if (isValidCommand(cmdObj)) {
                                logger_1.logger.debug("Found valid command in named export '".concat(cmdKey, "' in ").concat(path_1.default.basename(commandPath)));
                                return [2 /*return*/, cmdObj];
                            }
                        }
                        potentialConstructors = Object.keys(moduleAsObj_1)
                            .filter(function (key) { return typeof moduleAsObj_1[key] === 'function'; })
                            .filter(function (key) { return key !== 'default' && key !== '__esModule'; });
                        for (_b = 0, potentialConstructors_1 = potentialConstructors; _b < potentialConstructors_1.length; _b++) {
                            ctorKey = potentialConstructors_1[_b];
                            try {
                                logger_1.logger.debug("Trying to instantiate constructor '".concat(ctorKey, "' from ").concat(path_1.default.basename(commandPath)));
                                CommandClass = moduleAsObj_1[ctorKey];
                                instance = new CommandClass();
                                if (isValidCommand(instance)) {
                                    logger_1.logger.debug("Successfully instantiated command from constructor '".concat(ctorKey, "' in ").concat(path_1.default.basename(commandPath)));
                                    return [2 /*return*/, instance];
                                }
                            }
                            catch (error) {
                                logger_1.logger.debug("Failed to instantiate command from constructor '".concat(ctorKey, "' in ").concat(commandPath, ":"), error instanceof Error ? error.message : String(error));
                            }
                        }
                        // If module has a constructor function itself
                        if (typeof module_5 === 'function') {
                            try {
                                logger_1.logger.debug("Trying to instantiate command from module constructor in ".concat(path_1.default.basename(commandPath)));
                                CommandClass = module_5;
                                instance = new CommandClass();
                                if (isValidCommand(instance)) {
                                    logger_1.logger.debug("Successfully instantiated command from module constructor in ".concat(path_1.default.basename(commandPath)));
                                    return [2 /*return*/, instance];
                                }
                            }
                            catch (error) {
                                logger_1.logger.debug("Failed to instantiate command from module constructor in ".concat(commandPath, ":"), error instanceof Error ? error.message : String(error));
                            }
                        }
                    }
                    // If we've reached here, we couldn't find a valid command object
                    // Create a placeholder command for testing
                    if ((0, environment_1.isDebugMode)()) {
                        logger_1.logger.warn("Creating placeholder command for ".concat(path_1.default.basename(commandPath)));
                        fileName_1 = path_1.default.basename(commandPath, path_1.default.extname(commandPath));
                        placeholderCommand = {
                            data: {
                                name: fileName_1,
                                description: "Placeholder for ".concat(fileName_1),
                                // Skip toJSON as it's not in the expected interface
                            },
                            execute: function (interaction) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, interaction.reply({ content: "This is a placeholder for the ".concat(fileName_1, " command"), ephemeral: true })];
                                        case 1:
                                            _a.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            }); }
                        };
                        return [2 /*return*/, placeholderCommand];
                    }
                    logger_1.logger.warn("Command in file ".concat(path_1.default.basename(commandPath), " doesn't match expected format: must have data and execute properties"));
                    return [2 /*return*/, null];
                case 2:
                    error_5 = _c.sent();
                    logger_1.logger.error("Error loading command from ".concat(commandPath, ":"), error_5 instanceof Error ? error_5 : new Error(String(error_5)));
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.loadCommand = loadCommand;
/**
 * Helper to check if an object implements the Command interface
 */
function isValidCommand(obj) {
    if (obj === null || typeof obj !== 'object') {
        return false;
    }
    var possibleCommand = obj;
    var hasData = 'data' in possibleCommand &&
        possibleCommand.data !== null &&
        typeof possibleCommand.data === 'object';
    if (!hasData)
        return false;
    var data = possibleCommand.data;
    var hasValidName = 'name' in data && typeof data.name === 'string';
    var hasValidDescription = 'description' in data && typeof data.description === 'string';
    var hasExecuteFunction = 'execute' in possibleCommand && typeof possibleCommand.execute === 'function';
    return hasValidName && hasValidDescription && hasExecuteFunction;
}
/**
 * Scans a directory for modules matching the file extension
 */
function scanDirectory(dirPath, fileExtension) {
    // Log environment info
    var isTsNode = process.argv[0].includes('ts-node') ||
        (process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('ts-node'));
    var isDev = process.env.NODE_ENV === 'development';
    var isDebug = (0, environment_1.isDebugMode)();
    logger_1.logger.info("Scanning directory: ".concat(dirPath, " for files with extension ").concat(fileExtension));
    logger_1.logger.info("Environment: ts-node=".concat(isTsNode, ", dev=").concat(isDev, ", debug=").concat(isDebug));
    logger_1.logger.info("Current directory: ".concat(process.cwd()));
    // Handle non-existent directories
    if (!fs_1.default.existsSync(dirPath)) {
        logger_1.logger.warn("Directory not found: ".concat(dirPath));
        // Try to find alternative paths
        var altPaths = [
            dirPath.replace('/dist/', '/src/'),
            dirPath.replace('/src/', '/dist/'),
            path_1.default.join(process.cwd(), dirPath.replace(/^\//, '')),
            path_1.default.join(process.cwd(), 'src', dirPath.replace(/^\//, '')),
            path_1.default.join(process.cwd(), 'dist', dirPath.replace(/^\//, ''))
        ];
        logger_1.logger.debug("Trying alternative paths: ".concat(altPaths.join(', ')));
        for (var _i = 0, altPaths_1 = altPaths; _i < altPaths_1.length; _i++) {
            var altPath = altPaths_1[_i];
            if (fs_1.default.existsSync(altPath)) {
                logger_1.logger.info("Found alternative path: ".concat(altPath));
                return scanDirectory(altPath, fileExtension);
            }
        }
        return [];
    }
    try {
        // Get all files in the directory
        var allFiles = fs_1.default.readdirSync(dirPath);
        logger_1.logger.info("Found ".concat(allFiles.length, " files in directory: ").concat(dirPath));
        if (isDebug) {
            logger_1.logger.debug("All files in directory: ".concat(allFiles.join(', ')));
        }
        // Filter for files with the right extension
        var matchingFiles = allFiles.filter(function (file) { return file.endsWith(fileExtension); });
        logger_1.logger.info("Found ".concat(matchingFiles.length, " files with extension ").concat(fileExtension));
        if (matchingFiles.length === 0) {
            // Try alternative extension if none found
            var altExtension_1 = fileExtension === '.ts' ? '.js' : '.ts';
            var altFiles = allFiles.filter(function (file) { return file.endsWith(altExtension_1); });
            if (altFiles.length > 0) {
                logger_1.logger.info("No files with ".concat(fileExtension, " found, but found ").concat(altFiles.length, " files with ").concat(altExtension_1));
                if (isDev || isDebug) {
                    // In dev mode, try the alternative extension
                    return scanDirectory(dirPath, altExtension_1);
                }
            }
        }
        // Map to full paths
        var resultPaths = matchingFiles.map(function (file) { return path_1.default.join(dirPath, file); });
        if (resultPaths.length > 0) {
            logger_1.logger.info("Files to load: ".concat(resultPaths.map(function (p) { return path_1.default.basename(p); }).join(', ')));
        }
        else {
            logger_1.logger.warn("No matching files found in ".concat(dirPath, " with extension ").concat(fileExtension));
        }
        return resultPaths;
    }
    catch (error) {
        logger_1.logger.error("Error scanning directory ".concat(dirPath, ":"), error instanceof Error ? error : new Error(String(error)));
        return [];
    }
}
exports.scanDirectory = scanDirectory;
/**
 * Debug helper to test TypeScript module loading with a specific file
 * Can be used to verify modules are loading correctly
 */
function debugModuleLoading(filePath) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var fileUrl, module_6, instance, err_1, standardModule, instance, err_2, err_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 8, , 9]);
                    logger_1.logger.info("[DEBUG] Testing module loading for file: ".concat(filePath));
                    // Check file existence
                    if (!fs_1.default.existsSync(filePath)) {
                        logger_1.logger.error("[DEBUG] File not found: ".concat(filePath));
                        return [2 /*return*/];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    fileUrl = "file://".concat(path_1.default.resolve(filePath));
                    logger_1.logger.info("[DEBUG] Attempting dynamic import via URL: ".concat(fileUrl));
                    return [4 /*yield*/, Promise.resolve("".concat(fileUrl)).then(function (s) { return require(s); })];
                case 2:
                    module_6 = _b.sent();
                    logger_1.logger.info("[DEBUG] Module keys: ".concat(Object.keys(module_6).join(', ')));
                    if (module_6.default) {
                        logger_1.logger.info("[DEBUG] Default export type: ".concat(typeof module_6.default));
                        // If it's a class constructor
                        if (typeof module_6.default === 'function') {
                            try {
                                instance = new module_6.default();
                                logger_1.logger.info("[DEBUG] Instantiated default export: ".concat(instance.constructor.name));
                                logger_1.logger.info("[DEBUG] Instance keys: ".concat(Object.keys(instance).join(', ')));
                            }
                            catch (err) {
                                logger_1.logger.error("[DEBUG] Failed to instantiate class: ".concat(err instanceof Error ? err.message : String(err)));
                            }
                        }
                    }
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _b.sent();
                    logger_1.logger.error("[DEBUG] Dynamic import failed: ".concat(err_1 instanceof Error ? err_1.message : String(err_1)));
                    return [3 /*break*/, 4];
                case 4:
                    _b.trys.push([4, 6, , 7]);
                    logger_1.logger.info("[DEBUG] Attempting standard module loading");
                    return [4 /*yield*/, loadModule(filePath)];
                case 5:
                    standardModule = _b.sent();
                    logger_1.logger.info("[DEBUG] Standard module result type: ".concat(typeof standardModule));
                    if (standardModule) {
                        if (typeof standardModule === 'object') {
                            logger_1.logger.info("[DEBUG] Standard module keys: ".concat(Object.keys(standardModule).join(', ')));
                        }
                        else if (typeof standardModule === 'function') {
                            logger_1.logger.info("[DEBUG] Standard module is a function");
                            try {
                                instance = new standardModule();
                                logger_1.logger.info("[DEBUG] Instantiated function: ".concat(((_a = instance === null || instance === void 0 ? void 0 : instance.constructor) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown'));
                                logger_1.logger.info("[DEBUG] Instance keys: ".concat(Object.keys(instance).join(', ')));
                            }
                            catch (err) {
                                logger_1.logger.error("[DEBUG] Failed to instantiate function: ".concat(err instanceof Error ? err.message : String(err)));
                            }
                        }
                    }
                    return [3 /*break*/, 7];
                case 6:
                    err_2 = _b.sent();
                    logger_1.logger.error("[DEBUG] Standard module loading failed: ".concat(err_2 instanceof Error ? err_2.message : String(err_2)));
                    return [3 /*break*/, 7];
                case 7:
                    // Final report
                    logger_1.logger.info("[DEBUG] Module loading test complete for ".concat(filePath));
                    return [3 /*break*/, 9];
                case 8:
                    err_3 = _b.sent();
                    logger_1.logger.error("[DEBUG] Debug module loading failed: ".concat(err_3 instanceof Error ? err_3.message : String(err_3)));
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
exports.debugModuleLoading = debugModuleLoading;
