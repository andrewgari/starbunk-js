/**
 * Global Jest mocks for commonly used modules
 * Import this file in your test to set up these mocks
 */

import { createMockOneCondition } from './conditionMocks';

/**
 * Set up mock for OneCondition module
 * @param shouldTrigger Whether the condition should trigger (default: true)
 */
export function setupOneConditionMock(shouldTrigger = true): void {
	jest.mock('@/starbunk/bots/triggers/conditions/oneCondition', () => ({
		OneCondition: jest.fn().mockImplementation(() => createMockOneCondition(shouldTrigger))
	}));
}

/**
 * Set up mock for RandomChanceCondition module with a controllable mock
 * @returns The mock instance that can be controlled in tests
 */
export function setupRandomChanceConditionMock(): { mockRandomChance: { shouldTrigger: jest.Mock } } {
	const mockRandomChance = {
		shouldTrigger: jest.fn()
	};

	jest.mock('@/starbunk/bots/triggers/conditions/randomChanceCondition', () => ({
		RandomChanceCondition: jest.fn().mockImplementation(() => mockRandomChance)
	}));

	return { mockRandomChance };
}

/**
 * Set up mock for PatternCondition module
 * @param shouldTrigger Whether the condition should trigger (default: true)
 */
export function setupPatternConditionMock(shouldTrigger = true): void {
	jest.mock('@/starbunk/bots/triggers/conditions/patternCondition', () => ({
		PatternCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockResolvedValue(shouldTrigger)
		}))
	}));
}

/**
 * Set up mock for UserID module
 * @param guyId Custom ID for Guy (default: 'guy-user-id')
 */
export function setupUserIdMock(guyId = 'guy-user-id'): void {
	jest.mock('@/discord/userID', () => ({
		default: {
			Guy: guyId
		}
	}));
}

/**
 * Set up mock for AllConditions module
 * @param shouldTrigger Whether the condition should trigger (default: true)
 */
export function setupAllConditionsMock(shouldTrigger = true): void {
	jest.mock('@/starbunk/bots/triggers/conditions/allConditions', () => ({
		AllConditions: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockResolvedValue(shouldTrigger)
		}))
	}));
}

/**
 * Set up mock for UserCondition module
 * @param shouldTrigger Whether the condition should trigger (default: true)
 */
export function setupUserConditionMock(shouldTrigger = true): void {
	jest.mock('@/starbunk/bots/triggers/conditions/userCondition', () => ({
		UserCondition: jest.fn().mockImplementation(() => ({
			shouldTrigger: jest.fn().mockResolvedValue(shouldTrigger)
		}))
	}));
}

/**
 * Set up mock for userConditions module
 * @param shouldTrigger Whether the condition should trigger (default: false)
 */
export function setupGuyConditionMock(shouldTrigger = false): void {
	jest.mock('@/starbunk/bots/triggers/userConditions', () => ({
		getGuyCondition: jest.fn().mockReturnValue({
			shouldTrigger: jest.fn().mockResolvedValue(shouldTrigger)
		})
	}));
}
