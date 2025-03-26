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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMFactory = exports.LLMProviderError = exports.LLMProviderType = void 0;
var environment_1 = require("../../environment");
var ollamaProvider_1 = require("./providers/ollamaProvider");
var openaiProvider_1 = require("./providers/openaiProvider");
/**
 * LLM provider type
 */
var LLMProviderType;
(function (LLMProviderType) {
    LLMProviderType["OPENAI"] = "openai";
    LLMProviderType["OLLAMA"] = "ollama";
})(LLMProviderType || (exports.LLMProviderType = LLMProviderType = {}));
/**
 * Error class for LLM provider errors
 */
var LLMProviderError = /** @class */ (function (_super) {
    __extends(LLMProviderError, _super);
    function LLMProviderError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = 'LLMProviderError';
        return _this;
    }
    return LLMProviderError;
}(Error));
exports.LLMProviderError = LLMProviderError;
/**
 * Factory for creating LLM providers
 */
var LLMFactory = /** @class */ (function () {
    function LLMFactory() {
    }
    /**
     * Create an LLM provider
     * @param type Provider type
     * @param config Provider configuration
     */
    LLMFactory.createProvider = function (type, config) {
        switch (type) {
            case LLMProviderType.OPENAI:
                return new openaiProvider_1.OpenAIProvider(config);
            case LLMProviderType.OLLAMA:
                return new ollamaProvider_1.OllamaProvider(config);
            default:
                throw new LLMProviderError("Unknown LLM provider type: ".concat(type));
        }
    };
    /**
     * Create an LLM provider from environment variables
     * @param type Provider type
     * @param logger Logger instance
     */
    LLMFactory.createProviderFromEnv = function (type, logger) {
        switch (type) {
            case LLMProviderType.OPENAI: {
                var config = {
                    logger: logger,
                    defaultModel: environment_1.default.llm.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
                    apiKey: environment_1.default.llm.OPENAI_API_KEY || '',
                };
                return this.createProvider(type, config);
            }
            case LLMProviderType.OLLAMA: {
                var config = {
                    logger: logger,
                    defaultModel: environment_1.default.llm.OLLAMA_DEFAULT_MODEL || 'llama3:4b',
                    apiUrl: environment_1.default.llm.OLLAMA_API_URL || 'http://localhost:11434',
                };
                return this.createProvider(type, config);
            }
            default:
                throw new LLMProviderError("Unknown LLM provider type: ".concat(type));
        }
    };
    return LLMFactory;
}());
exports.LLMFactory = LLMFactory;
