"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomElement = exports.percentChance = exports.integer = void 0;
var crypto_1 = require("crypto");
var environment_1 = require("../environment");
exports.default = {
    roll: function (max) {
        return Math.floor(Math.random() * max);
    },
    /**
     * Returns true if a random percentage roll is less than the target percentage
     * @param target The target percentage (0-100)
     * @returns true if successful, false otherwise
     *
     * IMPORTANT: Always returns true (100% chance) when DEBUG mode is enabled,
     * regardless of the target percentage provided.
     */
    percentChance: function (target) {
        // Always return true in debug mode (100% chance)
        if ((0, environment_1.isDebugMode)()) {
            return true;
        }
        var roll = (0, crypto_1.randomInt)(100);
        return roll < target;
    },
};
/**
 * Generate a random integer between min and max (inclusive)
 * @param min Minimum value (inclusive)
 * @param max Maximum value (inclusive)
 * @returns Random integer
 */
function integer(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
exports.integer = integer;
/**
 * Returns true with the given percent chance (0-100)
 * IMPORTANT: Always returns true (100% chance) when DEBUG is enabled,
 * to make testing more predictable
 * @param percent Percentage chance (0-100)
 * @returns True if random chance hit, false otherwise
 */
function percentChance(percent) {
    // In debug mode, always return true
    if ((0, environment_1.isDebugMode)()) {
        return true;
    }
    // Normal random chance
    return Math.random() * 100 < percent;
}
exports.percentChance = percentChance;
/**
 * Returns a random element from an array
 * @param arr Array to select from
 * @returns Random element from the array
 */
function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
exports.randomElement = randomElement;
