"use strict";
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
exports.logger = exports.getLogger = exports.Logger = exports.LogLevel = void 0;
var chalk_1 = require("chalk");
var environment_1 = require("../environment");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["NONE"] = 0] = "NONE";
    LogLevel[LogLevel["ERROR"] = 1] = "ERROR";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["INFO"] = 3] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 4] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// SUCCESS has the same level as INFO
// Logger is now manually instantiated instead of using the @Service decorator
var Logger = /** @class */ (function () {
    function Logger() {
    }
    // accept a spread of parameters
    Logger.prototype.debug = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if ((0, environment_1.isDebugMode)()) {
            console.debug.apply(console, __spreadArray([this.formatMessage(chalk_1.default.blue(message), '🐛')], args, false));
        }
    };
    Logger.prototype.info = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.info.apply(console, __spreadArray([this.formatMessage(chalk_1.default.white(message), 'ℹ️')], args, false));
    };
    Logger.prototype.warn = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.warn.apply(console, __spreadArray([this.formatMessage(chalk_1.default.yellow(message), '⚠️')], args, false));
    };
    Logger.prototype.error = function (message, error) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        console.error.apply(console, __spreadArray([this.formatMessage(chalk_1.default.red(message), '❌'), error], args, false));
    };
    Logger.prototype.success = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.log.apply(console, __spreadArray([this.formatMessage(chalk_1.default.green(message), '✅')], args, false));
    };
    Logger.prototype.formatMessage = function (message, icon) {
        if (icon === void 0) { icon = ''; }
        var callerInfo = this.getCallerInfo();
        return "".concat(icon, " [").concat(new Date().toISOString(), "] ").concat(callerInfo, " ").concat(message);
    };
    Logger.prototype.getCallerInfo = function () {
        var _a;
        var stackTrace = ((_a = new Error().stack) === null || _a === void 0 ? void 0 : _a.split('\n')) || [];
        var callerLine = stackTrace[3] || '';
        var match = callerLine.match(/at (\S+)/);
        return match ? match[1] : 'unknown';
    };
    return Logger;
}());
exports.Logger = Logger;
// Singleton instance
var loggerInstance = new Logger();
// Helper function to get logger instance - now returns the singleton directly
function getLogger() {
    return loggerInstance;
}
exports.getLogger = getLogger;
// Export a logger instance for convenience
exports.logger = loggerInstance;
