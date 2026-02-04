import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { BlueBotTestHarness } from '../helpers/bluebot-test-harness';
import { resetStrategies } from '../../src/strategy/strategy-router';

describe('BlueBot E2E Tests', () => {
  let harness: BlueBotTestHarness;
  const originalEnemyEnv = process.env.BLUEBOT_ENEMY_USER_ID;
  const enemyUserId = '999999999999999999';
  const friendUserId = '111111111111111111';

  beforeEach(async () => {
    process.env.BLUEBOT_ENEMY_USER_ID = enemyUserId;
    resetStrategies();
    harness = new BlueBotTestHarness();
    await harness.start();
  });

  afterEach(() => {
    if (originalEnemyEnv !== undefined) {
      process.env.BLUEBOT_ENEMY_USER_ID = originalEnemyEnv;
    } else {
      delete process.env.BLUEBOT_ENEMY_USER_ID;
    }
  });

  describe('Basic blue detection', () => {
    test('should respond to "blue" message', async () => {
      const response = await harness.sendMessage('I love blue', friendUserId);
      expect(response).toBe('Did somebody say Blu?');
    });

    test('should respond to "blu" variation', async () => {
      const response = await harness.sendMessage('blu is great', friendUserId);
      expect(response).toBe('Did somebody say Blu?');
    });

    test('should not respond to unrelated messages', async () => {
      const response = await harness.sendMessage('Hello world', friendUserId);
      expect(response).toBeNull();
    });
  });

  describe('Nice requests', () => {
    test('should respond to "say something nice" request', async () => {
      const response = await harness.sendMessage(
        'bluebot say something nice about Alice',
        friendUserId,
      );
      expect(response).toBeTruthy();
      expect(response).toContain('Alice');
    });
  });

  describe('Enemy user handling', () => {
    test('should give enemy user default response for "blue"', async () => {
      const response = await harness.sendMessage('I love blue', enemyUserId);
      expect(response).toBe('Did somebody say Blu?');
    });
  });
});
