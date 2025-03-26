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
exports.OllamaProvider = void 0;
var genericProvider_1 = require("../genericProvider");
/**
 * Ollama provider implementation
 */
var OllamaProvider = /** @class */ (function (_super) {
    __extends(OllamaProvider, _super);
    function OllamaProvider(config) {
        var _this = _super.call(this, config) || this;
        _this.availableModels = [
            'gemma3:4b',
            'llama3',
            'llama3:8b',
            'llama3:70b',
            'mistral',
            'mixtral',
            'phi3'
        ];
        _this.baseUrl = config.apiUrl || 'http://localhost:11434';
        return _this;
    }
    /**
     * Initialize the Ollama provider
     */
    OllamaProvider.prototype.initializeProvider = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, data, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, fetch("".concat(this.baseUrl, "/api/tags"))];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            this.logger.error("Failed to connect to Ollama API: ".concat(response.statusText));
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _a.sent();
                        // Update available models from Ollama server if possible
                        if (data && typeof data === 'object' && 'models' in data && Array.isArray(data.models)) {
                            this.availableModels = data.models.map(function (model) { return model.name; });
                        }
                        this.logger.debug('Ollama client initialized successfully');
                        return [2 /*return*/, true];
                    case 3:
                        error_1 = _a.sent();
                        this.logger.error('Error initializing Ollama client', error_1);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the provider name
     */
    OllamaProvider.prototype.getProviderName = function () {
        return 'Ollama';
    };
    /**
     * Get available models
     */
    OllamaProvider.prototype.getAvailableModels = function () {
        return this.availableModels;
    };
    /**
     * Call the Ollama API
     * @param options Completion options
     */
    OllamaProvider.prototype.callProviderAPI = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var messages, requestBody, maxRetries, attempts, lastError, _loop_1, this_1, state_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.logger.debug("Calling Ollama API at ".concat(this.baseUrl, " with model: ").concat(options.model));
                        messages = options.messages.map(function (msg) { return ({
                            role: msg.role,
                            content: msg.content
                        }); });
                        requestBody = {
                            model: options.model,
                            messages: messages,
                            // Explicitly set streaming to false
                            stream: false,
                            options: {
                                temperature: options.temperature,
                                top_p: options.topP,
                                frequency_penalty: options.frequencyPenalty,
                                presence_penalty: options.presencePenalty,
                                stop: options.stop
                            }
                        };
                        maxRetries = 3;
                        attempts = 0;
                        lastError = null;
                        _loop_1 = function () {
                            var response, modelResponse, modelData, modelCheckError_1, contentType, _b, responseText, error_2, error_3, backoffTime_1;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        attempts++;
                                        _c.label = 1;
                                    case 1:
                                        _c.trys.push([1, 18, , 21]);
                                        this_1.logger.debug("Attempt ".concat(attempts, "/").concat(maxRetries, " to call Ollama API"));
                                        return [4 /*yield*/, fetch("".concat(this_1.baseUrl, "/api/chat"), {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify(requestBody)
                                            })];
                                    case 2:
                                        response = _c.sent();
                                        // Log detailed response information
                                        this_1.logger.debug("Ollama API response status: ".concat(response.status, " ").concat(response.statusText));
                                        if (!(response.status === 404)) return [3 /*break*/, 10];
                                        this_1.logger.error("Ollama API 404 Not Found error - URL: ".concat(this_1.baseUrl, "/api/chat, model: ").concat(options.model));
                                        _c.label = 3;
                                    case 3:
                                        _c.trys.push([3, 8, , 9]);
                                        return [4 /*yield*/, fetch("".concat(this_1.baseUrl, "/api/tags"))];
                                    case 4:
                                        modelResponse = _c.sent();
                                        if (!modelResponse.ok) return [3 /*break*/, 6];
                                        return [4 /*yield*/, modelResponse.json()];
                                    case 5:
                                        modelData = _c.sent();
                                        this_1.logger.debug("Available Ollama models: ".concat(JSON.stringify(modelData)));
                                        this_1.logger.error("Model \"".concat(options.model, "\" may not be available on the Ollama server"));
                                        return [3 /*break*/, 7];
                                    case 6:
                                        this_1.logger.error("Ollama server is not responding correctly to model list request: ".concat(modelResponse.status));
                                        _c.label = 7;
                                    case 7: return [3 /*break*/, 9];
                                    case 8:
                                        modelCheckError_1 = _c.sent();
                                        this_1.logger.error("Failed to check Ollama models: ".concat(modelCheckError_1 instanceof Error ? modelCheckError_1.message : String(modelCheckError_1)));
                                        return [3 /*break*/, 9];
                                    case 9:
                                        // Fall back to a default model if specified model is not found
                                        if (options.model !== 'llama3') {
                                            this_1.logger.warn("Attempting to fall back to llama3 model instead of ".concat(options.model));
                                            requestBody.model = 'llama3';
                                            return [2 /*return*/, "continue"];
                                        }
                                        _c.label = 10;
                                    case 10:
                                        if (!response.ok) {
                                            throw new Error("Ollama API error: ".concat(response.statusText, " (").concat(response.status, ")"));
                                        }
                                        _c.label = 11;
                                    case 11:
                                        _c.trys.push([11, 16, , 17]);
                                        contentType = response.headers.get('content-type');
                                        this_1.logger.debug("Ollama API response content-type: ".concat(contentType));
                                        if (!(contentType && contentType.includes('application/json'))) return [3 /*break*/, 13];
                                        _b = {};
                                        return [4 /*yield*/, response.json()];
                                    case 12: return [2 /*return*/, (_b.value = (_c.sent()), _b)];
                                    case 13: return [4 /*yield*/, response.text()];
                                    case 14:
                                        responseText = _c.sent();
                                        this_1.logger.debug("Ollama API returned non-JSON response. First 100 chars: ".concat(responseText.substring(0, 100)));
                                        try {
                                            return [2 /*return*/, { value: JSON.parse(responseText) }];
                                        }
                                        catch (jsonError) {
                                            // If it's not parseable JSON, create a suitable response object
                                            this_1.logger.warn('Could not parse Ollama response as JSON, creating fallback response');
                                            return [2 /*return*/, { value: {
                                                        message: {
                                                            content: responseText.slice(0, 500)
                                                        }
                                                    } }];
                                        }
                                        _c.label = 15;
                                    case 15: return [3 /*break*/, 17];
                                    case 16:
                                        error_2 = _c.sent();
                                        this_1.logger.error("Error processing Ollama API response: ".concat(error_2 instanceof Error ? error_2.message : String(error_2)));
                                        throw error_2;
                                    case 17: return [3 /*break*/, 21];
                                    case 18:
                                        error_3 = _c.sent();
                                        lastError = error_3 instanceof Error ? error_3 : new Error(String(error_3));
                                        this_1.logger.warn("Attempt ".concat(attempts, "/").concat(maxRetries, " failed: ").concat(lastError.message));
                                        if (!(attempts < maxRetries)) return [3 /*break*/, 20];
                                        backoffTime_1 = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
                                        this_1.logger.debug("Retrying in ".concat(backoffTime_1, "ms..."));
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, backoffTime_1); })];
                                    case 19:
                                        _c.sent();
                                        _c.label = 20;
                                    case 20: return [3 /*break*/, 21];
                                    case 21: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a.label = 1;
                    case 1:
                        if (!(attempts < maxRetries)) return [3 /*break*/, 3];
                        return [5 /*yield**/, _loop_1()];
                    case 2:
                        state_1 = _a.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        return [3 /*break*/, 1];
                    case 3:
                        // If we got here, all attempts failed
                        this.logger.error("All ".concat(maxRetries, " attempts to call Ollama API failed"));
                        // Fall back to a static response if all attempts fail
                        if (lastError) {
                            throw new Error("Ollama API failed after ".concat(maxRetries, " attempts: ").concat(lastError.message));
                        }
                        else {
                            throw new Error("Ollama API failed after ".concat(maxRetries, " attempts with unknown error"));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Parse the Ollama API response
     * @param response Ollama API response
     * @param options Original completion options
     */
    OllamaProvider.prototype.parseProviderResponse = function (response, options) {
        var _a;
        var ollamaResponse = response;
        return {
            content: ((_a = ollamaResponse.message) === null || _a === void 0 ? void 0 : _a.content) || '',
            model: options.model,
            provider: this.getProviderName()
        };
    };
    return OllamaProvider;
}(genericProvider_1.GenericProvider));
exports.OllamaProvider = OllamaProvider;
