"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attitudeTrigger = void 0;
const conditions_1 = require("../../core/conditions");
const responses_1 = require("../../core/responses");
const trigger_response_1 = require("../../core/trigger-response");
const constants_1 = require("./constants");
// Trigger for negative attitude statements
exports.attitudeTrigger = (0, trigger_response_1.createTriggerResponse)({
    name: 'attitude-trigger',
    condition: (0, conditions_1.matchesPattern)(constants_1.ATTITUDE_BOT_PATTERNS.Default),
    response: (0, responses_1.staticResponse)(constants_1.ATTITUDE_BOT_RESPONSES.Default),
    priority: 1
});
