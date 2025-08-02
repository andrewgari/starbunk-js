"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDebugMode = exports.isDebugMode = void 0;
const dotenv_1 = require("dotenv");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Environment configuration abstraction that loads and validates environment variables.
 * This is the central place to access all environment variables and ensures type safety.
 */
// Find the .env file
const envPath = path.resolve(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);
// Log whether the .env file exists
console.log(`[Environment] Looking for .env file at: ${envPath}`);
console.log(`[Environment] .env file exists: ${envExists}`);
// Load environment variables from .env file - looking in project root
const result = (0, dotenv_1.config)({ path: envPath });
console.log(`[Environment] .env file loaded successfully: ${result.parsed ? 'Yes' : 'No'}`);
// Log available environment variables for debugging
console.log('[Environment] Environment variables loaded:');
console.log(`[Environment] - STARBUNK_TOKEN: ${process.env.STARBUNK_TOKEN ? 'Set' : 'Not set'}`);
console.log(`[Environment] - SNOWBUNK_TOKEN: ${process.env.SNOWBUNK_TOKEN ? 'Set' : 'Not set'}`);
console.log(`[Environment] - DISCORD_WEBHOOK_URL: ${process.env.DISCORD_WEBHOOK_URL ? 'Set' : 'Not set'}`);
console.log(`[Environment] - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'Set' : 'Not set'}`);
console.log(`[Environment] - OLLAMA_API_URL: ${process.env.OLLAMA_API_URL ? 'Set' : 'Not set'}`);
console.log(`[Environment] - DEBUG_MODE: ${process.env.DEBUG_MODE}`);
console.log(`[Environment] - TESTING_SERVER_IDS: ${process.env.TESTING_SERVER_IDS || 'Not set'}`);
console.log(`[Environment] - TESTING_CHANNEL_IDS: ${process.env.TESTING_CHANNEL_IDS || 'Not set'}`);
console.log(`[Environment] - Is Debug Mode Active: ${isDebugMode()}`);
// --- Start Validation ---
if (!process.env.STARBUNK_TOKEN) {
    console.error('[Environment] FATAL: Required environment variable STARBUNK_TOKEN is not set.');
    process.exit(1);
}
// Add other critical variable checks here if needed
// --- End Validation ---
// Helper function to check debug mode (updated to use DEBUG_MODE)
function isDebugMode() {
    return process.env.DEBUG_MODE === 'true';
}
exports.isDebugMode = isDebugMode;
// Helper function to set debug mode (for tests or runtime changes)
function setDebugMode(value) {
    process.env.DEBUG_MODE = value ? 'true' : 'false';
}
exports.setDebugMode = setDebugMode;
// Export default object with environment variables
const environment = {
    app: {
        DEBUG_MODE: process.env.DEBUG_MODE,
        TESTING_SERVER_IDS: process.env.TESTING_SERVER_IDS,
        TESTING_CHANNEL_IDS: process.env.TESTING_CHANNEL_IDS
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
