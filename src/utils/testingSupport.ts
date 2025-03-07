import { Client, Interaction, Message, TextChannel } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import loggerAdapter from '../services/loggerAdapter';
import { DebugUtils } from './debug';

/**
 * Utilities for automated testing support
 */
export class TestingSupport {
	private static interactions: Array<{
		timestamp: number;
		type: string;
		user: string;
		data: Record<string, unknown>;
	}> = [];

	private static messages: Array<{
		timestamp: number;
		author: string;
		content: string;
		channelId: string;
	}> = [];

	private static responses: Array<{
		timestamp: number;
		bot: string;
		content: string;
		channelId: string;
		replyTo?: string;
	}> = [];

	private static testCaseDirectory = path.join(process.cwd(), 'test-cases');

	/**
   * Initialize the test recording system
   */
	static async init(): Promise<void> {
		if (!DebugUtils.isDebugMode()) return;

		try {
			// Create test case directory if it doesn't exist
			await fs.mkdir(this.testCaseDirectory, { recursive: true });
			loggerAdapter.debug(`📝 Test recording initialized. Directory: ${this.testCaseDirectory}`);
		} catch (error) {
			loggerAdapter.error('Failed to initialize test recording', error as Error);
		}
	}

	/**
   * Record a user interaction
   */
	static recordInteraction(interaction: Interaction): void {
		if (!DebugUtils.isDebugMode()) return;

		try {
			const interactionData: Record<string, unknown> = {
				id: interaction.id,
				type: interaction.type,
				guildId: interaction.guildId,
				channelId: interaction.channelId
			};

			// Add command data if it's a command interaction
			if (interaction.isChatInputCommand()) {
				interactionData.commandName = interaction.commandName;
				interactionData.options = interaction.options.data.map(option => ({
					name: option.name,
					value: option.value,
					type: option.type
				}));
			}

			this.interactions.push({
				timestamp: Date.now(),
				type: interaction.constructor.name,
				user: interaction.user.tag,
				data: interactionData
			});

			loggerAdapter.debug(`📝 Recorded interaction: ${interaction.id}`);
		} catch (error) {
			loggerAdapter.error('Failed to record interaction', error as Error);
		}
	}

	/**
   * Record a user message
   */
	static recordMessage(message: Message): void {
		if (!DebugUtils.isDebugMode() || message.author.bot) return;

		try {
			this.messages.push({
				timestamp: Date.now(),
				author: message.author.tag,
				content: message.content,
				channelId: message.channelId
			});

			loggerAdapter.debug(`📝 Recorded message: ${message.id}`);
		} catch (error) {
			loggerAdapter.error('Failed to record message', error as Error);
		}
	}

	/**
   * Record a bot response
   */
	static recordResponse(message: Message, botName: string): void {
		if (!DebugUtils.isDebugMode() || !message.author.bot) return;

		try {
			this.responses.push({
				timestamp: Date.now(),
				bot: botName,
				content: message.content,
				channelId: message.channelId,
				replyTo: message.reference?.messageId
			});

			loggerAdapter.debug(`📝 Recorded response from ${botName}: ${message.id}`);
		} catch (error) {
			loggerAdapter.error('Failed to record response', error as Error);
		}
	}

	/**
   * Generate a test case from recorded interactions
   */
	static async generateTestCase(name: string): Promise<string> {
		if (!DebugUtils.isDebugMode()) return '';

		try {
			const testCase = {
				name,
				timestamp: Date.now(),
				interactions: this.interactions,
				messages: this.messages,
				responses: this.responses
			};

			const testCasePath = path.join(this.testCaseDirectory, `${name}-${Date.now()}.json`);
			await fs.writeFile(testCasePath, JSON.stringify(testCase, null, 2));

			// Reset recorded data
			this.interactions = [];
			this.messages = [];
			this.responses = [];

			loggerAdapter.debug(`✅ Generated test case: ${testCasePath}`);
			return testCasePath;
		} catch (error) {
			loggerAdapter.error('Failed to generate test case', error as Error);
			return '';
		}
	}

	/**
   * Replay a test case
   */
	static async replayTestCase(client: Client, testCasePath: string): Promise<void> {
		if (!DebugUtils.isDebugMode()) return;

		try {
			const testCaseContent = await fs.readFile(testCasePath, 'utf-8');
			const testCase = JSON.parse(testCaseContent);

			loggerAdapter.debug(`▶️ Replaying test case: ${testCase.name}`);

			// Replay messages
			for (const message of testCase.messages) {
				try {
					const channel = await client.channels.fetch(message.channelId) as TextChannel;
					if (channel) {
						loggerAdapter.debug(`▶️ Simulating message: ${message.content}`);
						// We can't actually create messages as other users, but we can log what would happen
						loggerAdapter.debug(`👤 ${message.author} would say: ${message.content}`);
					}
				} catch (error) {
					loggerAdapter.error(`Failed to replay message in channel ${message.channelId}`, error as Error);
				}
			}

			loggerAdapter.debug(`✅ Test case replay completed: ${testCase.name}`);
		} catch (error) {
			loggerAdapter.error('Failed to replay test case', error as Error);
		}
	}

	/**
   * List available test cases
   */
	static async listTestCases(): Promise<string[]> {
		try {
			const files = await fs.readdir(this.testCaseDirectory);
			return files.filter(file => file.endsWith('.json'));
		} catch (error) {
			loggerAdapter.error('Failed to list test cases', error as Error);
			return [];
		}
	}

	/**
   * Validate bot behavior against expected outcomes
   */
	static async validateBehavior(testCasePath: string, actualResponses: Array<{
		bot: string;
		content: string;
		channelId: string;
	}>): Promise<{ passed: boolean; mismatches: string[] }> {
		try {
			const testCaseContent = await fs.readFile(testCasePath, 'utf-8');
			const testCase = JSON.parse(testCaseContent);

			const expectedResponses = testCase.responses;
			const mismatches: string[] = [];

			// Compare expected vs actual responses
			for (let i = 0; i < expectedResponses.length; i++) {
				const expected = expectedResponses[i];
				const actual = actualResponses[i];

				if (!actual) {
					mismatches.push(`Missing response #${i + 1}: Expected ${expected.bot} to respond`);
					continue;
				}

				if (expected.bot !== actual.bot) {
					mismatches.push(`Bot mismatch for response #${i + 1}: Expected ${expected.bot}, got ${actual.bot}`);
				}

				if (expected.channelId !== actual.channelId) {
					mismatches.push(`Channel mismatch for response #${i + 1}: Expected ${expected.channelId}, got ${actual.channelId}`);
				}

				// For content, we do a more flexible check since exact matches might be too strict
				if (!this.contentMatches(expected.content, actual.content)) {
					mismatches.push(`Content mismatch for response #${i + 1} from ${expected.bot}`);
				}
			}

			// Check for extra responses
			if (actualResponses.length > expectedResponses.length) {
				mismatches.push(`Extra responses: Got ${actualResponses.length}, expected ${expectedResponses.length}`);
			}

			return {
				passed: mismatches.length === 0,
				mismatches
			};
		} catch (error) {
			loggerAdapter.error('Failed to validate behavior', error as Error);
			return {
				passed: false,
				mismatches: ['Error validating behavior']
			};
		}
	}

	/**
   * Check if content matches, allowing for some flexibility
   */
	private static contentMatches(expected: string, actual: string): boolean {
		// Remove whitespace and case sensitivity for more flexible matching
		const normalizedExpected = expected.trim().toLowerCase();
		const normalizedActual = actual.trim().toLowerCase();

		// Exact match
		if (normalizedExpected === normalizedActual) {
			return true;
		}

		// Check if actual contains the expected content
		if (normalizedActual.includes(normalizedExpected)) {
			return true;
		}

		// TODO: Add more sophisticated matching if needed

		return false;
	}
}
