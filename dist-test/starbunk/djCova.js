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
exports.DJCova = void 0;
var voice_1 = require("@discordjs/voice");
var ytdl_core_1 = require("@distube/ytdl-core");
var logger_1 = require("../services/logger");
var DJCova = /** @class */ (function () {
    function DJCova() {
        logger_1.logger.debug('🎵 Initializing DJCova audio player');
        this.player = (0, voice_1.createAudioPlayer)();
    }
    DJCova.prototype.start = function (url) {
        return __awaiter(this, void 0, void 0, function () {
            var stream;
            return __generator(this, function (_a) {
                if (this.resource) {
                    logger_1.logger.warn('Attempted to start playback while already playing');
                    return [2 /*return*/];
                }
                logger_1.logger.info("\uD83C\uDFB5 Starting playback from URL: ".concat(url));
                try {
                    stream = (0, ytdl_core_1.default)(url, {
                        filter: 'audioonly',
                        quality: 'highestaudio',
                        highWaterMark: 1 << 25,
                        dlChunkSize: 0,
                        requestOptions: {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
                                'Accept-Language': 'en-US,en;q=0.9',
                            },
                        },
                    });
                    this.resource = (0, voice_1.createAudioResource)(stream, {
                        inputType: voice_1.StreamType.WebmOpus,
                        inlineVolume: true,
                    });
                    if (this.resource.volume) {
                        this.resource.volume.setVolume(0.5);
                    }
                    logger_1.logger.debug('▶️ Playing resource...');
                    this.player.play(this.resource);
                    logger_1.logger.success('🎵 Audio resource created and playback started');
                }
                catch (error) {
                    logger_1.logger.error('Failed to start audio playback', error);
                }
                return [2 /*return*/];
            });
        });
    };
    DJCova.prototype.play = function () {
        if (!this.resource) {
            logger_1.logger.warn('Attempted to play without an active audio resource');
            return;
        }
        logger_1.logger.debug('▶️ Playing audio resource');
        this.player.play(this.resource);
    };
    DJCova.prototype.stop = function () {
        logger_1.logger.info('⏹️ Stopping audio playback');
        this.player.stop();
        this.resource = undefined;
    };
    DJCova.prototype.pause = function () {
        logger_1.logger.info('⏸️ Pausing audio playback');
        this.player.pause();
    };
    DJCova.prototype.changeVolume = function (vol) {
        var _a;
        logger_1.logger.info("\uD83D\uDD0A Adjusting volume to ".concat(vol, "%"));
        if ((_a = this.resource) === null || _a === void 0 ? void 0 : _a.volume) {
            this.resource.volume.setVolume(vol / 100);
        }
        else {
            logger_1.logger.warn('Attempted to change volume without active resource');
        }
    };
    DJCova.prototype.subscribe = function (channel) {
        logger_1.logger.debug("\uD83C\uDFA7 Subscribing to voice channel");
        try {
            var subscription = channel.subscribe(this.player);
            if (subscription) {
                logger_1.logger.success('Player successfully subscribed to connection.');
            }
            return subscription;
        }
        catch (error) {
            logger_1.logger.error('Failed to subscribe player to the connection.');
            return undefined;
        }
    };
    DJCova.prototype.on = function (status, callback) {
        logger_1.logger.debug("\uD83D\uDCE1 Registering listener for ".concat(status, " status"));
        this.player.on(status, callback);
    };
    return DJCova;
}());
exports.DJCova = DJCova;
