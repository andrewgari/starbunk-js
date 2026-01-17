"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.getLogger = getLogger;
class Logger {
    serviceName;
    structuredLogging;
    constructor(serviceName = 'bunkbot') {
        this.serviceName = serviceName;
        this.structuredLogging = process.env.ENABLE_STRUCTURED_LOGGING === 'true';
    }
    debug(message, context) {
        if (process.env.DEBUG_MODE === 'true') {
            this.log('debug', message, context);
        }
    }
    info(message, context) {
        this.log('info', message, context);
    }
    warn(message, context) {
        this.log('warn', message, context);
    }
    error(message, error, context) {
        const errorContext = error instanceof Error ? { error: error.message, stack: error.stack } : { error };
        this.log('error', message, { ...errorContext, ...context });
    }
    success(message, context) {
        this.log('info', message, context);
    }
    setServiceName(serviceName) {
        this.serviceName = serviceName;
    }
    enableStructuredLogging(enabled) {
        this.structuredLogging = enabled;
    }
    log(level, message, context) {
        if (this.structuredLogging) {
            this.logStructured(level, message, context);
        }
        else {
            this.logFormatted(level, message, context);
        }
    }
    logStructured(level, message, context) {
        const logEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            service: this.serviceName,
            ...context,
        };
        console.log(JSON.stringify(logEntry));
    }
    logFormatted(level, message, context) {
        const timestamp = new Date().toISOString();
        const levelUpper = level.toUpperCase().padEnd(5);
        const prefix = `[${timestamp}] [${levelUpper}] [${this.serviceName}]`;
        if (context && Object.keys(context).length > 0) {
            console.log(`${prefix} ${message}`, context);
        }
        else {
            console.log(`${prefix} ${message}`);
        }
    }
}
let loggerInstance;
function getLogger() {
    if (!loggerInstance) {
        loggerInstance = new Logger();
    }
    return loggerInstance;
}
exports.logger = getLogger();
