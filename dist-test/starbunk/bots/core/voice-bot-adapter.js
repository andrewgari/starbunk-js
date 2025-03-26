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
exports.VoiceBotAdapter = exports.BaseVoiceBot = void 0;
var logger_1 = require("../../../services/logger");
/**
 * Base class for voice bots that provides common functionality
 */
var BaseVoiceBot = /** @class */ (function () {
    function BaseVoiceBot() {
        this.volume = 1.0;
    }
    BaseVoiceBot.prototype.getVolume = function () {
        return this.volume;
    };
    BaseVoiceBot.prototype.setVolume = function (newVolume) {
        this.volume = Math.max(0, Math.min(newVolume, 2.0));
        logger_1.logger.debug("[".concat(this.name, "] Volume set to ").concat(this.volume));
    };
    return BaseVoiceBot;
}());
exports.BaseVoiceBot = BaseVoiceBot;
/**
 * Adapter class that wraps a VoiceBot to make it compatible with BaseVoiceBot interface.
 * This allows strategy-based voice bots to work with the existing voice processing pipeline.
 */
var VoiceBotAdapter = /** @class */ (function (_super) {
    __extends(VoiceBotAdapter, _super);
    function VoiceBotAdapter(voiceBot) {
        var _this = _super.call(this) || this;
        _this.voiceBot = voiceBot;
        logger_1.logger.debug("[VoiceBotAdapter] Created adapter for ".concat(voiceBot.name));
        return _this;
    }
    Object.defineProperty(VoiceBotAdapter.prototype, "name", {
        get: function () {
            return this.voiceBot.name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(VoiceBotAdapter.prototype, "description", {
        get: function () {
            return this.voiceBot.description;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(VoiceBotAdapter.prototype, "botIdentity", {
        get: function () {
            // We can't easily access the default identity from the voice bot
            // So we'll use a placeholder that will be overridden by the specific trigger's identity
            return {
                botName: this.voiceBot.name,
                avatarUrl: '' // Will be provided by the specific trigger
            };
        },
        enumerable: false,
        configurable: true
    });
    VoiceBotAdapter.prototype.getVolume = function () {
        return this.voiceBot.getVolume();
    };
    VoiceBotAdapter.prototype.setVolume = function (newVolume) {
        this.voiceBot.setVolume(newVolume);
    };
    VoiceBotAdapter.prototype.onVoiceStateUpdate = function (oldState, newState) {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.voiceBot.onVoiceStateUpdate(oldState, newState)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        logger_1.logger.error("[".concat(this.name, "] Error in voice bot state handling:"), error_1 instanceof Error ? error_1 : new Error(String(error_1)));
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return VoiceBotAdapter;
}(BaseVoiceBot));
exports.VoiceBotAdapter = VoiceBotAdapter;
