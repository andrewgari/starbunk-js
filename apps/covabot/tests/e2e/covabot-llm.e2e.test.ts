/**
 * E2E Tests for CovaBot LLM Integration (Single-Prompt Architecture)
 *
 * These tests verify that CovaBot:
 * 1. Calls the LLM with proper context
 * 2. Uses a SINGLE LLM call that both decides whether to respond AND generates the response
 * 3. Remains silent when the LLM decides not to respond
 * 4. Properly tracks all LLM calls
 * 5. Handles LLM errors gracefully
 *
 * Architecture Note:
 * CovaBot now uses a unified single-prompt system where the LLM receives context
 * about whether Cova was mentioned/referenced and makes both the decision and
 * generates the response in one call. This is simpler and more efficient than
 * the previous two-prompt system.
 *
 * Testing Strategy:
 * Uses a mock LLM provider to return predictable responses, avoiding dependency
 * on external LLM services and making tests deterministic.
 */

import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { Message } from 'discord.js';
import {
	FakeDiscordEnvironment,
	LLMCallTracker,
	container,
	ServiceId,
	logger,
} from '@starbunk/shared';
import { CovaBot } from '../../src/cova-bot/cova-bot';
import { covaTrigger, covaDirectMentionTrigger } from '../../src/cova-bot/triggers';
import { createMockLLMManagerForE2E, ResponseScenario } from './helpers/mock-llm-setup';

describe('CovaBot E2E - LLM Integration (Mock)', () => {
	let fakeEnv: FakeDiscordEnvironment;
	let tracker: LLMCallTracker;
	const TEST_USER = 'TestUser';
	const TEST_CHANNEL = 'test-channel';
	const TEST_GUILD = 'Test Guild';

	beforeAll(async () => {
		// Disable DEBUG_MODE for E2E tests so bot responds to TestUser, not just Cova
		process.env.DEBUG_MODE = 'false';
		// Create fake Discord environment
		fakeEnv = new FakeDiscordEnvironment({
			botUserId: '139592376443338752',
			botUsername: 'CovaBot',
			logToConsole: true,
		});
		await fakeEnv.initialize();

		// Create test fixtures
		const guild = fakeEnv.createGuild(TEST_GUILD);
		fakeEnv.createChannel(TEST_CHANNEL, guild);
		fakeEnv.createUser(TEST_USER);

		// Register logger in container
		logger.setServiceName('CovaBot-E2E');
		container.register(ServiceId.Logger, logger);

		// Register a mock DiscordService that returns valid identity for Cova
		// This is needed because getCovaIdentity() tries to fetch from Discord
		const mockDiscordService = {
			getMemberAsync: async (_guildId: string, userId: string) => {
				if (userId === '139592376443338752') {
					return {
						nickname: 'Cova',
						user: {
							globalName: 'Cova',
							username: 'cova',
							displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/139592376443338752/avatar.png',
						},
						displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/139592376443338752/avatar.png',
					};
				}
				return null;
			},
		};
		container.register(ServiceId.DiscordService, mockDiscordService);
	});

	beforeEach(async () => {
		// Create a fresh tracker for each test
		tracker = new LLMCallTracker();
	});

	describe('LLM Response Scenarios', () => {
		it('should handle "Yes, respond with this" - LLM decides to respond', async () => {
			// Create mock LLM that responds
			const llmManager = await createMockLLMManagerForE2E(tracker, ResponseScenario.GOOD_RESPONSE);
			container.register(ServiceId.LLMManager, llmManager);

			// Create CovaBot instance
			const cova = new CovaBot({
				name: 'CovaBot',
				description: 'E2E Test Bot',
				defaultIdentity: {
					botName: 'Cova',
					avatarUrl: 'https://example.com/avatar.png',
				},
				triggers: [covaTrigger],
				defaultResponseRate: 100,
				skipBotMessages: true,
			});

			// Send a message
			const message = await fakeEnv.sendUserMessage(
				TEST_USER,
				TEST_CHANNEL,
				'Hey CovaBot, how are you?',
			);

			await cova.processMessage(message as unknown as Message);

			// Verify LLM was called
			expect(tracker.hasCalls()).toBe(true);
			expect(tracker.getCalls().length).toBeGreaterThan(0);

			// Verify the call was successful and returned a response
			const calls = tracker.getCalls();
			expect(calls[0].error).toBeUndefined();
			expect(calls[0].response?.content).toBeTruthy();
			expect(calls[0].response?.content).not.toBe('');
			expect(calls[0].provider).toBe('mock');
		});

		it('should handle "No, don\'t respond" - LLM returns empty response', async () => {
			// Create mock LLM that returns empty response
			const llmManager = await createMockLLMManagerForE2E(tracker, ResponseScenario.NO_RESPONSE);
			container.register(ServiceId.LLMManager, llmManager);

			// Create CovaBot instance
			const cova = new CovaBot({
				name: 'CovaBot',
				description: 'E2E Test Bot',
				defaultIdentity: {
					botName: 'Cova',
					avatarUrl: 'https://example.com/avatar.png',
				},
				triggers: [covaTrigger],
				defaultResponseRate: 100,
				skipBotMessages: true,
			});

			// Send a message
			const message = await fakeEnv.sendUserMessage(
				TEST_USER,
				TEST_CHANNEL,
				'just chatting with friends',
			);

			await cova.processMessage(message as unknown as Message);

			// Verify LLM was called
			expect(tracker.hasCalls()).toBe(true);

			// Verify the response was empty (LLM decided not to respond)
			const calls = tracker.getCalls();
			expect(calls[0].error).toBeUndefined();
			expect(calls[0].response?.content).toBe('');
		});

		it('should handle "Yes, but a bad response" - LLM returns unexpected content', async () => {
			// Create mock LLM that returns bad response
			const llmManager = await createMockLLMManagerForE2E(tracker, ResponseScenario.BAD_RESPONSE);
			container.register(ServiceId.LLMManager, llmManager);

			// Create CovaBot instance
			const cova = new CovaBot({
				name: 'CovaBot',
				description: 'E2E Test Bot',
				defaultIdentity: {
					botName: 'Cova',
					avatarUrl: 'https://example.com/avatar.png',
				},
				triggers: [covaTrigger],
				defaultResponseRate: 100,
				skipBotMessages: true,
			});

			// Send a message
			const message = await fakeEnv.sendUserMessage(
				TEST_USER,
				TEST_CHANNEL,
				'Hey CovaBot',
			);

			await cova.processMessage(message as unknown as Message);

			// Verify LLM was called
			expect(tracker.hasCalls()).toBe(true);

			// Verify the response exists but is unexpected
			const calls = tracker.getCalls();
			expect(calls[0].error).toBeUndefined();
			expect(calls[0].response?.content).toContain('SYSTEM ERROR');
		});
	});
});
