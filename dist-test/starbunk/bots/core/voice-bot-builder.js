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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVoiceBot = void 0;
var logger_1 = require("../../../services/logger");
function createVoiceBot(config) {
    var _a;
    var volume = (_a = config.volume) !== null && _a !== void 0 ? _a : 1.0;
    return {
        name: config.name,
        description: config.description,
        getVolume: function () {
            return volume;
        },
        setVolume: function (newVolume) {
            volume = Math.max(0, Math.min(newVolume, 2.0));
            logger_1.logger.debug("[".concat(config.name, "] Volume set to ").concat(volume));
        },
        onVoiceStateUpdate: function (oldState, newState) {
            return __awaiter(this, void 0, void 0, function () {
                var sortedTriggers, _i, sortedTriggers_1, trigger, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            logger_1.logger.debug("[".concat(config.name, "] Processing voice state update"));
                            sortedTriggers = __spreadArray([], config.triggers, true).sort(function (a, b) {
                                return (b.priority || 0) - (a.priority || 0);
                            });
                            _i = 0, sortedTriggers_1 = sortedTriggers;
                            _a.label = 1;
                        case 1:
                            if (!(_i < sortedTriggers_1.length)) return [3 /*break*/, 8];
                            trigger = sortedTriggers_1[_i];
                            _a.label = 2;
                        case 2:
                            _a.trys.push([2, 6, , 7]);
                            return [4 /*yield*/, trigger.condition(oldState, newState)];
                        case 3:
                            if (!_a.sent()) return [3 /*break*/, 5];
                            logger_1.logger.debug("[".concat(config.name, "] Trigger \"").concat(trigger.name, "\" matched"));
                            return [4 /*yield*/, trigger.response(oldState, newState)];
                        case 4:
                            _a.sent();
                            return [2 /*return*/];
                        case 5: return [3 /*break*/, 7];
                        case 6:
                            error_1 = _a.sent();
                            logger_1.logger.error("[".concat(config.name, "] Error in voice trigger ").concat(trigger.name, ":"), error_1 instanceof Error ? error_1 : new Error(String(error_1)));
                            return [3 /*break*/, 7];
                        case 7:
                            _i++;
                            return [3 /*break*/, 1];
                        case 8: return [2 /*return*/];
                    }
                });
            });
        }
    };
}
exports.createVoiceBot = createVoiceBot;
