"use strict";
// Constants for Attitude Bot
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATTITUDE_BOT_RESPONSES = exports.ATTITUDE_BOT_PATTERNS = exports.ATTITUDE_BOT_AVATAR_URL = exports.ATTITUDE_BOT_NAME = void 0;
exports.ATTITUDE_BOT_NAME = 'Xander Crews';
exports.ATTITUDE_BOT_AVATAR_URL = 'https://i.ytimg.com/vi/56PMgO3q2-A/sddefault.jpg';
exports.ATTITUDE_BOT_PATTERNS = {
    Default: /(you|I|they|we) can'?t/mi
};
exports.ATTITUDE_BOT_RESPONSES = {
    Default: 'Well, not with *THAT* attitude!!!'
};
