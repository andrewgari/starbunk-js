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
exports.OpenAIProvider = void 0;
var openai_1 = require("openai");
var genericProvider_1 = require("../genericProvider");
/**
 * OpenAI provider implementation
 */
var OpenAIProvider = /** @class */ (function (_super) {
    __extends(OpenAIProvider, _super);
    function OpenAIProvider(config) {
        var _this = _super.call(this, config) || this;
        _this.client = null;
        _this.availableModels = [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-4',
            'gpt-3.5-turbo'
        ];
        return _this;
    }
    /**
     * Initialize the OpenAI provider
     */
    OpenAIProvider.prototype.initializeProvider = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    if (!this.config.apiKey) {
                        this.logger.error('OpenAI API key not found in configuration');
                        return [2 /*return*/, false];
                    }
                    this.client = new openai_1.default({
                        apiKey: this.config.apiKey
                    });
                    this.logger.debug('OpenAI client initialized successfully');
                    return [2 /*return*/, true];
                }
                catch (error) {
                    this.logger.error('Error initializing OpenAI client', error);
                    this.client = null;
                    return [2 /*return*/, false];
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Get the provider name
     */
    OpenAIProvider.prototype.getProviderName = function () {
        return 'OpenAI';
    };
    /**
     * Get available models
     */
    OpenAIProvider.prototype.getAvailableModels = function () {
        return this.availableModels;
    };
    /**
     * Call the OpenAI API
     * @param options Completion options
     */
    OpenAIProvider.prototype.callProviderAPI = function (options) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.client) {
                            throw new Error('OpenAI client not initialized');
                        }
                        return [4 /*yield*/, this.client.chat.completions.create({
                                model: options.model,
                                messages: options.messages.map(function (msg) { return ({
                                    role: msg.role,
                                    content: msg.content
                                }); }),
                                temperature: (_a = options.temperature) !== null && _a !== void 0 ? _a : 0.7,
                                max_tokens: options.maxTokens,
                                top_p: options.topP,
                                frequency_penalty: options.frequencyPenalty,
                                presence_penalty: options.presencePenalty,
                                stop: options.stop
                            })];
                    case 1: return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    /**
     * Parse the OpenAI API response
     * @param response OpenAI API response
     * @param options Original completion options
     */
    OpenAIProvider.prototype.parseProviderResponse = function (response, options) {
        var openaiResponse = response;
        return {
            content: openaiResponse.choices[0].message.content || '',
            model: options.model,
            provider: this.getProviderName()
        };
    };
    return OpenAIProvider;
}(genericProvider_1.GenericProvider));
exports.OpenAIProvider = OpenAIProvider;
