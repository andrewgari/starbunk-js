import { vi } from 'vitest';
import { createMockMessage, MockMessageOptions } from './mock-message';
import { Message, TextChannel, Client } from 'discord.js';
import { BlueBotDiscordService } from '../../src/discord/discord-service';

/**
 * Creates a mock message with a spy attached to the channel's send method
 * @param content - The message content
 * @param options - Additional options for creating the mock message
 * @returns An object containing the message and the spy
 */
export function setupMessageWithSpy(content: string, options?: Partial<MockMessageOptions>) {
  const message = createMockMessage({
    content,
    ...options,
  });
  const sendSpy = vi.fn();
  (message.channel as TextChannel).send = sendSpy;

  return { message: message as Message, sendSpy };
}

/**
 * Helper to test if a strategy should respond to a message
 * @param strategy - The strategy to test
 * @param content - The message content
 * @param expected - Whether the strategy should respond
 * @param options - Additional options for creating the mock message
 */
export async function expectShouldRespond(
  strategy: { shouldRespond: (message: Message) => Promise<boolean> },
  content: string,
  expected: boolean,
  options?: Partial<MockMessageOptions>,
) {
  const message = createMockMessage({
    content,
    ...options,
  });
  const result = await strategy.shouldRespond(message as Message);
  return expect(result).toBe(expected);
}

/**
 * Helper to test if a strategy should NOT respond to a message
 * Convenience wrapper around expectShouldRespond with expected=false
 */
export async function expectShouldNotRespond(
  strategy: { shouldRespond: (message: Message) => Promise<boolean> },
  content: string,
  options?: Partial<MockMessageOptions>,
) {
  return expectShouldRespond(strategy, content, false, options);
}

/**
 * Helper to test multiple message contents with the same expected result
 * @param strategy - The strategy to test
 * @param testCases - Array of message contents to test
 * @param expected - Whether the strategy should respond
 * @param options - Additional options for creating mock messages
 */
export async function testMultipleCases(
  strategy: { shouldRespond: (message: Message) => Promise<boolean> },
  testCases: string[],
  expected: boolean,
  options?: Partial<MockMessageOptions>,
) {
  for (const content of testCases) {
    await expectShouldRespond(strategy, content, expected, options);
  }
}

/**
 * Sets up environment variables for enemy user testing
 * @param enemyUserId - The enemy user ID
 * @param guildId - The guild ID (optional)
 * @returns Cleanup function to restore original environment
 */
export function setupEnemyEnv(enemyUserId: string, guildId?: string) {
  const originalEnemyEnv = process.env.BLUEBOT_ENEMY_USER_ID;
  process.env.BLUEBOT_ENEMY_USER_ID = enemyUserId;
  return () => {
    if (originalEnemyEnv !== undefined) {
      process.env.BLUEBOT_ENEMY_USER_ID = originalEnemyEnv;
    } else {
      delete process.env.BLUEBOT_ENEMY_USER_ID;
    }
  };
}

/**
 * Sets up the BlueBotDiscordService with a mock client from a message
 * @param message - The mock message containing the client
 */
export function setupDiscordService(message: Partial<Message>) {
  const discordService = BlueBotDiscordService.getInstance();
  discordService.setClient(message.client as Client);
}

/**
 * Helper to test a strategy's response
 * @param strategy - The strategy to test
 * @param message - The message to test with
 * @param expectedResponse - The expected response (string or regex)
 */
export async function expectResponse(
  strategy: { getResponse: (message: Message) => Promise<string> },
  message: Message,
  expectedResponse: string | RegExp,
) {
  const response = await strategy.getResponse(message);
  if (typeof expectedResponse === 'string') {
    return expect(response).toBe(expectedResponse);
  } else {
    return expect(response).toMatch(expectedResponse);
  }
}

/**
 * Helper to test a strategy's response contains a substring
 * @param strategy - The strategy to test
 * @param message - The message to test with
 * @param expectedSubstring - The expected substring
 */
export async function expectResponseContains(
  strategy: { getResponse: (message: Message) => Promise<string> },
  message: Message,
  expectedSubstring: string,
) {
  const response = await strategy.getResponse(message);
  return expect(response).toContain(expectedSubstring);
}
