/**
 * E2E Tests for CovaBot LLM Integration (Single-Prompt Architecture)
 *
 * These tests verify that CovaBot:
 * 1. Actually calls Ollama LLM (not mocked)
 * 2. Uses a SINGLE LLM call that both decides whether to respond AND generates the response
 * 3. Remains silent when the LLM decides not to respond
 * 4. Properly tracks all LLM calls
 *
 * Architecture Note:
 * CovaBot now uses a unified single-prompt system where the LLM receives context
 * about whether Cova was mentioned/referenced and makes both the decision and
 * generates the response in one call. This is simpler and more efficient than
 * the previous two-prompt system.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { Message } from 'discord.js';
import {
	FakeDiscordEnvironment,
	LLMCallTracker,
	assertLLMCalled,
	container,
	ServiceId,
	createLLMManagerWithTracker,
	logger,
} from '@starbunk/shared';
import { CovaBot } from '../../src/cova-bot/covaBot';
import { covaTrigger, covaDirectMentionTrigger } from '../../src/cova-bot/triggers';

// Skip tests if no LLM provider is available
// Ollama is now available in CI via service container
// Locally: can use either OPENAI_API_KEY or OLLAMA_API_URL
const hasLLMProvider = !!(process.env.OPENAI_API_KEY || process.env.OLLAMA_API_URL);

const describeIfLLMAvailable = hasLLMProvider ? describe : describe.skip;

describeIfLLMAvailable('CovaBot E2E - LLM Integration (Ollama)', () => {
	let fakeEnv: FakeDiscordEnvironment;
	let tracker: LLMCallTracker;
	const TEST_USER = 'TestUser';
	const TEST_CHANNEL = 'test-channel';
	const TEST_GUILD = 'Test Guild';

	beforeAll(async () => {
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

		// Create LLM call tracker
		tracker = new LLMCallTracker();

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

		// Create LLM Manager with tracker and register it in the container
		const llmManager = await createLLMManagerWithTracker(logger, tracker);
		container.register(ServiceId.LLMManager, llmManager);
	});

	describe('Direct Mention Responses', () => {
		it('should call Ollama LLM when directly mentioned', async () => {
			// Clear tracker
			tracker.clear();

			// Create CovaBot instance
			const cova = new CovaBot({
				name: 'CovaBot',
				description: 'E2E Test Bot',
				defaultIdentity: {
					botName: 'Cova',
					avatarUrl: 'https://example.com/avatar.png',
				},
				triggers: [covaDirectMentionTrigger],
				defaultResponseRate: 100,
				skipBotMessages: true,
			});

			// Simulate a user mentioning Cova
			const message = await fakeEnv.sendUserMessage(
				TEST_USER,
				TEST_CHANNEL,
				'<@139592376443338752> Hello Cova, how are you?',
			);

			// Process the message
			await cova.processMessage(message as unknown as Message);

			// Verify that Ollama was actually called
			assertLLMCalled(tracker, 'ollama');

			// Verify we have at least one call
			expect(tracker.getCalls().length).toBeGreaterThan(0);

			// Verify the call was to Ollama
			expect(tracker.wasProviderUsed('ollama')).toBe(true);

			// Verify no fallback was triggered
			expect(tracker.hadFallbacks()).toBe(false);
		});

		it('should generate non-hardcoded responses using LLM', async () => {
			tracker.clear();

			const cova = new CovaBot({
				name: 'CovaBot',
				description: 'E2E Test Bot',
				defaultIdentity: {
					botName: 'Cova',
					avatarUrl: 'https://example.com/avatar.png',
				},
				triggers: [covaDirectMentionTrigger],
				defaultResponseRate: 100,
				skipBotMessages: true,
			});

			const message = await fakeEnv.sendUserMessage(
				TEST_USER,
				TEST_CHANNEL,
				'<@139592376443338752> Tell me about TypeScript',
			);

			await cova.processMessage(message as unknown as Message);

			// Verify LLM was called
			assertLLMCalled(tracker, 'ollama');

			// Get the calls and verify the prompt contains the user's message
			const calls = tracker.getCalls();
			expect(calls.length).toBeGreaterThan(0);

			// Verify the LLM received the user's message in some form
			const lastCall = calls[calls.length - 1];
			const messagesContent = JSON.stringify(lastCall.options.messages);
			expect(messagesContent.toLowerCase()).toContain('typescript');
		});
	});

	describe('Single-Prompt Decision + Response', () => {
		it('should use single LLM call for both decision and response', async () => {
			tracker.clear();

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

			const message = await fakeEnv.sendUserMessage(
				TEST_USER,
				TEST_CHANNEL,
				'<@139592376443338752> What do you think about TypeScript?',
			);

			await cova.processMessage(message as unknown as Message);

			// Should have exactly ONE LLM call (decision + response combined)
			const calls = tracker.getCalls();
			expect(calls.length).toBe(1);
			assertLLMCalled(tracker, 'ollama');

			// Verify the call was to Ollama
			expect(calls[0].provider).toBe('ollama');
		});

		it('should handle contextual messages with single LLM call', async () => {
			tracker.clear();

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

			const message = await fakeEnv.sendUserMessage(
				TEST_USER,
				TEST_CHANNEL,
				'Hey everyone, what do you think about the new features?',
			);

			await cova.processMessage(message as unknown as Message);

			// Should have at most ONE LLM call (single-prompt system)
			// The LLM decides whether to respond and generates response in one call
			const calls = tracker.getCalls();
			expect(calls.length).toBeLessThanOrEqual(1);

			if (calls.length > 0) {
				expect(calls[0].provider).toBe('ollama');
			}
		});
	});

	describe('LLM Call Statistics', () => {
		it('should track detailed statistics about LLM usage', async () => {
			tracker.clear();

			const cova = new CovaBot({
				name: 'CovaBot',
				description: 'E2E Test Bot',
				defaultIdentity: {
					botName: 'Cova',
					avatarUrl: 'https://example.com/avatar.png',
				},
				triggers: [covaDirectMentionTrigger],
				defaultResponseRate: 100,
				skipBotMessages: true,
			});

			const message = await fakeEnv.sendUserMessage(
				TEST_USER,
				TEST_CHANNEL,
				'<@139592376443338752> Hello!',
			);

			await cova.processMessage(message as unknown as Message);

			// Get statistics
			const stats = tracker.getStats();

			// Verify statistics
			expect(stats.total).toBeGreaterThan(0);
			expect(stats.byProvider['ollama']).toBeGreaterThan(0);
			expect(stats.fallbacks).toBe(0); // No fallbacks should occur
			expect(stats.failures).toBe(0); // No failures should occur
		});
	});

	describe('No Mock Usage', () => {
		it('should never use mock provider in E2E tests', async () => {
			tracker.clear();

			const cova = new CovaBot({
				name: 'CovaBot',
				description: 'E2E Test Bot',
				defaultIdentity: {
					botName: 'Cova',
					avatarUrl: 'https://example.com/avatar.png',
				},
				triggers: [covaDirectMentionTrigger],
				defaultResponseRate: 100,
				skipBotMessages: true,
			});

			const message = await fakeEnv.sendUserMessage(
				TEST_USER,
				TEST_CHANNEL,
				'<@139592376443338752> Test message',
			);

			await cova.processMessage(message as unknown as Message);

			// Verify no mock was used
			expect(tracker.wasProviderUsed('mock')).toBe(false);

			// Verify only Ollama was used
			const stats = tracker.getStats();
			expect(Object.keys(stats.byProvider)).toEqual(['ollama']);
		});
	});
});


