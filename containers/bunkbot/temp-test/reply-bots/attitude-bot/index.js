"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bot_factory_1 = require("../../core/bot-factory");
const constants_1 = require("./constants");
const triggers_1 = require("./triggers");
// Create the Attitude Bot that responds to negative statements
exports.default = bot_factory_1.BotFactory.createBot({
    name: constants_1.ATTITUDE_BOT_NAME,
    description: 'Responds to negative statements with "Well, not with THAT attitude!!!"',
    defaultIdentity: {
        botName: constants_1.ATTITUDE_BOT_NAME,
        avatarUrl: constants_1.ATTITUDE_BOT_AVATAR_URL
    },
    skipBotMessages: true,
    triggers: [triggers_1.attitudeTrigger]
});
