/**
 * Mocks for various condition classes used in bots
 */

import { Message } from "discord.js";

// Define a type for the mock condition
export type MockCondition = {
	shouldTrigger: jest.Mock<Promise<boolean>, [message?: Message]>;
};

/**
 * Create a mock OneCondition that always triggers
 */
export const createMockOneCondition = (shouldTrigger = true): MockCondition => ({
	shouldTrigger: jest.fn().mockResolvedValue(shouldTrigger)
});

/**
 * Create a mock PatternCondition that always triggers
 */
export const createMockPatternCondition = (shouldTrigger = true): MockCondition => ({
	shouldTrigger: jest.fn().mockResolvedValue(shouldTrigger)
});

/**
 * Create a mock RandomChanceCondition that always triggers
 */
export const createMockRandomChanceCondition = (shouldTrigger = true): MockCondition => ({
	shouldTrigger: jest.fn().mockResolvedValue(shouldTrigger)
});

/**
 * Create a mock UserCondition that always triggers
 */
export const createMockUserCondition = (shouldTrigger = true): MockCondition => ({
	shouldTrigger: jest.fn().mockResolvedValue(shouldTrigger)
});

/**
 * Create a mock AllConditions that always triggers
 */
export const createMockAllConditions = (shouldTrigger = true): MockCondition => ({
	shouldTrigger: jest.fn().mockResolvedValue(shouldTrigger)
});
