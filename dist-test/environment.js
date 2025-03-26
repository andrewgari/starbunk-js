"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDebugMode = exports.isDebugMode = void 0;
var dotenv_1 = require("dotenv");
var fs_1 = require("fs");
var path_1 = require("path");
/**
 * Environment configuration abstraction that loads and validates environment variables.
 * This is the central place to access all environment variables and ensures type safety.
 */
// Find the .env file
var envPath = path_1.default.resolve(process.cwd(), '.env');
var envExists = fs_1.default.existsSync(envPath);
// Log whether the .env file exists
console.log("[Environment] Looking for .env file at: ".concat(envPath));
console.log("[Environment] .env file exists: ".concat(envExists));
// Load environment variables from .env file - looking in project root
var result = (0, dotenv_1.config)({ path: envPath });
console.log("[Environment] .env file loaded successfully: ".concat(result.parsed ? 'Yes' : 'No'));
// Log available environment variables for debugging
console.log('[Environment] Environment variables loaded:');
console.log("[Environment] - STARBUNK_TOKEN: ".concat(process.env.STARBUNK_TOKEN ? 'Set' : 'Not set'));
console.log("[Environment] - SNOWBUNK_TOKEN: ".concat(process.env.SNOWBUNK_TOKEN ? 'Set' : 'Not set'));
console.log("[Environment] - DISCORD_WEBHOOK_URL: ".concat(process.env.DISCORD_WEBHOOK_URL ? 'Set' : 'Not set'));
console.log("[Environment] - OPENAI_API_KEY: ".concat(process.env.OPENAI_API_KEY ? 'Set' : 'Not set'));
console.log("[Environment] - OLLAMA_API_URL: ".concat(process.env.OLLAMA_API_URL ? 'Set' : 'Not set'));
console.log("[Environment] - DEBUG: ".concat(process.env.DEBUG));
console.log("[Environment] - Is Debug Mode Active: ".concat(isDebugMode()));
// Helper function to check debug mode
function isDebugMode() {
    return process.env.DEBUG === 'true';
}
exports.isDebugMode = isDebugMode;
// Helper function to set debug mode (for tests or runtime changes)
function setDebugMode(value) {
    process.env.DEBUG = value ? 'true' : 'false';
}
exports.setDebugMode = setDebugMode;
// Export default object with environment variables
var environment = {
    app: {
        DEBUG: process.env.DEBUG
    },
    discord: {
        STARBUNK_TOKEN: process.env.STARBUNK_TOKEN,
        SNOWBUNK_TOKEN: process.env.SNOWBUNK_TOKEN,
        WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL
    },
    llm: {
        OPENAI_DEFAULT_MODEL: process.env.OPENAI_DEFAULT_MODEL,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OLLAMA_DEFAULT_MODEL: process.env.OLLAMA_DEFAULT_MODEL,
        OLLAMA_API_URL: process.env.OLLAMA_API_URL
    }
};
// Export the environment object as frozen to prevent modifications
exports.default = Object.freeze(environment);
