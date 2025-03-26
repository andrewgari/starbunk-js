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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.LLMManager = exports.PromptNotRegisteredError = exports.ProviderNotAvailableError = void 0;
var llmFactory_1 = require("./llmFactory");
var promptManager_1 = require("./promptManager");
/**
 * Error thrown when a provider is not available
 */
var ProviderNotAvailableError = /** @class */ (function (_super) {
    __extends(ProviderNotAvailableError, _super);
    function ProviderNotAvailableError(providerType) {
        var _this = _super.call(this, "Provider ".concat(providerType, " is not available")) || this;
        _this.name = 'ProviderNotAvailableError';
        return _this;
    }
    return ProviderNotAvailableError;
}(Error));
exports.ProviderNotAvailableError = ProviderNotAvailableError;
/**
 * Error thrown when a prompt is not registered
 */
var PromptNotRegisteredError = /** @class */ (function (_super) {
    __extends(PromptNotRegisteredError, _super);
    function PromptNotRegisteredError(promptType) {
        var _this = _super.call(this, "Prompt type ".concat(promptType, " not registered")) || this;
        _this.name = 'PromptNotRegisteredError';
        return _this;
    }
    return PromptNotRegisteredError;
}(Error));
exports.PromptNotRegisteredError = PromptNotRegisteredError;
/**
 * Manager for LLM services
 */
var LLMManager = /** @class */ (function () {
    function LLMManager(logger, defaultProvider) {
        this.providers = new Map();
        this.logger = logger;
        this.defaultProvider = defaultProvider;
    }
    /**
     * Initialize a provider
     * @param type Provider type
     */
    LLMManager.prototype.initializeProvider = function (type) {
        return __awaiter(this, void 0, void 0, function () {
            var provider, initialized, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        provider = llmFactory_1.LLMFactory.createProviderFromEnv(type, this.logger);
                        return [4 /*yield*/, provider.initialize()];
                    case 1:
                        initialized = _a.sent();
                        if (initialized) {
                            this.providers.set(type, provider);
                            this.logger.debug("Initialized ".concat(type, " provider"));
                        }
                        else {
                            this.logger.error("Failed to initialize ".concat(type, " provider"));
                        }
                        return [2 /*return*/, initialized];
                    case 2:
                        error_1 = _a.sent();
                        this.logger.error("Error initializing ".concat(type, " provider"), error_1);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Initialize all supported providers
     */
    LLMManager.prototype.initializeAllProviders = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, type;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: 
                    // Always try to initialize the default provider first
                    return [4 /*yield*/, this.initializeProvider(this.defaultProvider)];
                    case 1:
                        // Always try to initialize the default provider first
                        _b.sent();
                        _i = 0, _a = Object.values(llmFactory_1.LLMProviderType);
                        _b.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        type = _a[_i];
                        if (!(type !== this.defaultProvider)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.initializeProvider(type)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get a provider
     * @param type Provider type
     */
    LLMManager.prototype.getProvider = function (type) {
        return this.providers.get(type);
    };
    /**
     * Get the default provider
     */
    LLMManager.prototype.getDefaultProvider = function () {
        return this.providers.get(this.defaultProvider);
    };
    /**
     * Check if a provider is available
     * @param type Provider type
     */
    LLMManager.prototype.isProviderAvailable = function (type) {
        var provider = this.providers.get(type);
        return provider !== undefined && provider.isInitialized();
    };
    /**
     * Get an available provider, using fallback if necessary
     * @param type Provider type
     * @param allowFallback Whether to fall back to the default provider
     * @deprecated Use getProvider with appropriate error handling instead
     */
    LLMManager.prototype.getAvailableProvider = function (type, allowFallback) {
        if (allowFallback === void 0) { allowFallback = true; }
        var provider = this.getProvider(type);
        if (provider && provider.isInitialized()) {
            return provider;
        }
        if (allowFallback && type !== this.defaultProvider) {
            this.logger.warn("Provider ".concat(type, " not available, falling back to ").concat(this.defaultProvider));
            var defaultProvider = this.getProvider(this.defaultProvider);
            if (defaultProvider && defaultProvider.isInitialized()) {
                return defaultProvider;
            }
        }
        this.logger.error("No available provider found for ".concat(type));
        throw new ProviderNotAvailableError(type);
    };
    /**
     * Create a completion using a provider
     * @param options Completion options
     * @param fallbackOptions Additional options for fallback handling
     */
    LLMManager.prototype.createCompletion = function (options, fallbackOptions) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var useOpenAiFallback, requestedProviderType, provider, error_2, openAiOptions, openAiProvider, fallbackError_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        useOpenAiFallback = (_a = fallbackOptions === null || fallbackOptions === void 0 ? void 0 : fallbackOptions.useOpenAiFallback) !== null && _a !== void 0 ? _a : true;
                        requestedProviderType = options.provider || this.defaultProvider;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 8]);
                        provider = this.getProvider(requestedProviderType);
                        if (!provider) {
                            this.logger.warn("Provider ".concat(requestedProviderType, " not found, using default"));
                            throw new ProviderNotAvailableError(requestedProviderType);
                        }
                        return [4 /*yield*/, provider.createCompletion(options)];
                    case 2: return [2 /*return*/, _b.sent()];
                    case 3:
                        error_2 = _b.sent();
                        this.logger.error("Error with provider ".concat(requestedProviderType, ":"), error_2 instanceof Error ? error_2 : new Error(String(error_2)));
                        if (!(useOpenAiFallback &&
                            requestedProviderType === llmFactory_1.LLMProviderType.OLLAMA &&
                            this.isProviderAvailable(llmFactory_1.LLMProviderType.OPENAI))) return [3 /*break*/, 7];
                        this.logger.info('Falling back to OpenAI provider');
                        openAiOptions = __assign({}, options);
                        // If the model is llama-based, switch to a GPT model
                        if (openAiOptions.model.toLowerCase().startsWith('llama')) {
                            openAiOptions.model = 'gpt-3.5-turbo';
                        }
                        // Set the provider to OpenAI
                        openAiOptions.provider = llmFactory_1.LLMProviderType.OPENAI;
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 7]);
                        openAiProvider = this.getProvider(llmFactory_1.LLMProviderType.OPENAI);
                        if (!openAiProvider) {
                            throw new ProviderNotAvailableError(llmFactory_1.LLMProviderType.OPENAI);
                        }
                        return [4 /*yield*/, openAiProvider.createCompletion(openAiOptions)];
                    case 5: return [2 /*return*/, _b.sent()];
                    case 6:
                        fallbackError_1 = _b.sent();
                        this.logger.error('Error with OpenAI fallback:', fallbackError_1 instanceof Error ? fallbackError_1 : new Error(String(fallbackError_1)));
                        throw new Error("Failed to create completion with primary and fallback providers: ".concat(error_2 instanceof Error ? error_2.message : String(error_2), ", ").concat(fallbackError_1 instanceof Error ? fallbackError_1.message : String(fallbackError_1)));
                    case 7: throw error_2;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create a simple completion with just a prompt
     * @param typeOrPrompt Provider type or prompt text
     * @param promptOrSystemPrompt Prompt text or system prompt
     * @param systemPromptOrFallback System prompt or fallback flag
     * @param fallbackToDefault Whether to fall back to the default provider
     */
    LLMManager.prototype.createSimpleCompletion = function (typeOrPrompt, promptOrSystemPrompt, systemPromptOrFallback, fallbackToDefault) {
        var _a;
        if (fallbackToDefault === void 0) { fallbackToDefault = true; }
        return __awaiter(this, void 0, void 0, function () {
            var type, prompt_1, systemPrompt, fallback, provider, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        type = void 0;
                        systemPrompt = void 0;
                        fallback = void 0;
                        if (typeof typeOrPrompt === 'string' && (typeof promptOrSystemPrompt === 'string' || promptOrSystemPrompt === undefined)) {
                            if (Object.values(llmFactory_1.LLMProviderType).includes(typeOrPrompt)) {
                                // First overload: (type, prompt, systemPrompt, fallback)
                                type = typeOrPrompt;
                                prompt_1 = promptOrSystemPrompt;
                                systemPrompt = systemPromptOrFallback;
                                fallback = fallbackToDefault;
                            }
                            else {
                                // Second overload: (prompt, systemPrompt, fallback)
                                type = this.defaultProvider;
                                prompt_1 = typeOrPrompt;
                                systemPrompt = promptOrSystemPrompt;
                                fallback = (_a = systemPromptOrFallback) !== null && _a !== void 0 ? _a : true;
                            }
                        }
                        else {
                            // Invalid parameters
                            throw new Error('Invalid parameters for createSimpleCompletion');
                        }
                        provider = this.getAvailableProvider(type, fallback);
                        return [4 /*yield*/, provider.createSimpleCompletion(prompt_1, systemPrompt)];
                    case 1: 
                    // Create the completion
                    return [2 /*return*/, _b.sent()];
                    case 2:
                        error_3 = _b.sent();
                        if (error_3 instanceof ProviderNotAvailableError) {
                            this.logger.error(error_3.message);
                        }
                        else {
                            this.logger.error('Error creating simple completion', error_3);
                        }
                        throw error_3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create a completion using a registered prompt
     * @param promptType The type of prompt to use
     * @param userMessage The user message to format
     * @param options Additional options for the completion
     */
    LLMManager.prototype.createPromptCompletion = function (promptType, userMessage, options) {
        if (options === void 0) { options = {}; }
        return __awaiter(this, void 0, void 0, function () {
            var providerType, _a, fallbackToDefault, _b, fallbackToDirectCall, model, temperature, maxTokens, type, messages, defaultOptions, provider, response, error_4, prompt_2, provider, response, error_5;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        providerType = options.providerType, _a = options.fallbackToDefault, fallbackToDefault = _a === void 0 ? true : _a, _b = options.fallbackToDirectCall, fallbackToDirectCall = _b === void 0 ? true : _b, model = options.model, temperature = options.temperature, maxTokens = options.maxTokens;
                        type = providerType || this.defaultProvider;
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 8, , 9]);
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 4, , 7]);
                        messages = (0, promptManager_1.formatPromptMessages)(promptType, userMessage);
                        defaultOptions = (0, promptManager_1.getPromptDefaultOptions)(promptType);
                        provider = this.getAvailableProvider(type, fallbackToDefault);
                        return [4 /*yield*/, this.createCompletion({
                                model: model || provider.getAvailableModels()[0],
                                messages: messages,
                                temperature: temperature !== null && temperature !== void 0 ? temperature : defaultOptions.temperature,
                                maxTokens: maxTokens !== null && maxTokens !== void 0 ? maxTokens : defaultOptions.maxTokens
                            }, { useOpenAiFallback: false })];
                    case 3:
                        response = _c.sent();
                        return [2 /*return*/, response.content];
                    case 4:
                        error_4 = _c.sent();
                        // If the error is not related to provider availability or prompt registration, rethrow
                        if (!(error_4 instanceof ProviderNotAvailableError) &&
                            !(error_4 instanceof PromptNotRegisteredError) &&
                            !fallbackToDirectCall) {
                            throw error_4;
                        }
                        // Log the error
                        this.logger.warn("Error using prompt registry for ".concat(promptType, ", falling back to direct call: ").concat(error_4 instanceof Error ? error_4.message : String(error_4)));
                        if (!fallbackToDirectCall) return [3 /*break*/, 6];
                        prompt_2 = promptManager_1.PromptRegistry.getPrompt(promptType);
                        if (!prompt_2) {
                            throw new PromptNotRegisteredError(promptType);
                        }
                        provider = this.getAvailableProvider(type, fallbackToDefault);
                        return [4 /*yield*/, this.createCompletion({
                                model: model || provider.getAvailableModels()[0],
                                messages: [
                                    {
                                        role: 'system',
                                        content: prompt_2.systemContent
                                    },
                                    {
                                        role: 'user',
                                        content: prompt_2.formatUserMessage(userMessage)
                                    }
                                ],
                                temperature: temperature !== null && temperature !== void 0 ? temperature : prompt_2.defaultTemperature,
                                maxTokens: maxTokens !== null && maxTokens !== void 0 ? maxTokens : prompt_2.defaultMaxTokens
                            }, { useOpenAiFallback: false })];
                    case 5:
                        response = _c.sent();
                        return [2 /*return*/, response.content];
                    case 6: 
                    // Rethrow the error if fallback is not enabled
                    throw error_4;
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        error_5 = _c.sent();
                        this.logger.error("Error creating completion for prompt ".concat(promptType), error_5);
                        throw error_5;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    return LLMManager;
}());
exports.LLMManager = LLMManager;
