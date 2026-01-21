import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { processMessageByStrategy, resetStrategies } from '../../src/strategy/strategy-router';
import { createMockMessage } from '../helpers/mock-message';
import { Message, TextChannel, Client } from 'discord.js';
import { BlueBotDiscordService } from '../../src/discord/discord-service';

describe('E2E: Message Flow', () => {
	const originalEnemyEnv = process.env.BLUEBOT_ENEMY_USER_ID;
	const originalGuildEnv = process.env.GUILD_ID;
	const enemyUserId = '999999999999999999';
	const friendUserId = '111111111111111111';
	const guildId = '999999999999999999';

	/**
	 * Helper function to send a "blue" message and assert the default response
	 * This reduces duplication in tests that need to trigger the initial blue detection
	 */
	async function sendBlueMessage(authorId: string = friendUserId, content: string = 'blue') {
		const message = createMockMessage({ content, authorId });
		const sendSpy = vi.fn();
		(message.channel as TextChannel).send = sendSpy;

		await processMessageByStrategy(message as Message);

		expect(sendSpy).toHaveBeenCalledWith('Did somebody say Blu?');
		expect(sendSpy).toHaveBeenCalledTimes(1);

		return { message, sendSpy };
	}

	beforeEach(() => {
		process.env.BLUEBOT_ENEMY_USER_ID = enemyUserId;
		process.env.GUILD_ID = guildId;
		// Reset strategy state to ensure tests don't interfere with each other
		resetStrategies();
	});

	afterEach(() => {
		if (originalEnemyEnv !== undefined) {
			process.env.BLUEBOT_ENEMY_USER_ID = originalEnemyEnv;
		} else {
			delete process.env.BLUEBOT_ENEMY_USER_ID;
		}
		if (originalGuildEnv !== undefined) {
			process.env.GUILD_ID = originalGuildEnv;
		} else {
			delete process.env.GUILD_ID;
		}
	});

	describe('Basic blue detection', () => {
		test('should respond to "blue" with default response', async () => {
			const message = createMockMessage({ content: 'I love blue', authorId: friendUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledWith('Did somebody say Blu?');
			expect(sendSpy).toHaveBeenCalledTimes(1);
		});

		test('should respond to variations of blue', async () => {
			const variations = ['blu', 'azul', 'blau', 'blew'];

			for (const word of variations) {
				resetStrategies(); // Reset state between iterations
				const message = createMockMessage({ content: `I like ${word}`, authorId: friendUserId });
				const sendSpy = vi.fn();
				(message.channel as TextChannel).send = sendSpy;

				await processMessageByStrategy(message as Message);

				expect(sendSpy).toHaveBeenCalledWith('Did somebody say Blu?');
			}
		});

		test('should not respond to messages without blue', async () => {
			const message = createMockMessage({ content: 'Hello world', authorId: friendUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).not.toHaveBeenCalled();
		});
	});

	describe('Nice requests', () => {
		test('should respond to "bluebot say something nice about" request', async () => {
			const message = createMockMessage({ content: 'bluebot say something nice about Alice', authorId: friendUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			const response = sendSpy.mock.calls[0][0];
			expect(response).toContain('Alice');
		});

		test('should handle "blubot" variation', async () => {
			const message = createMockMessage({ content: 'blubot say something nice about Bob', authorId: friendUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			const response = sendSpy.mock.calls[0][0];
			expect(response).toContain('Bob');
		});

		test('should mention requester when asked about "me"', async () => {
			const message = createMockMessage({ content: 'bluebot say something nice about me', authorId: friendUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			const response = sendSpy.mock.calls[0][0];
			// Should mention the user who requested
			expect(response).toContain(`<@${friendUserId}>`);
			expect(response).toContain("I think you're pretty blue!");
		});

		test('should mention user when given user mention', async () => {
			const targetUserId = '222222222222222222'; // FriendUser from DEFAULT_TEST_MEMBERS
			const message = createMockMessage({ content: `bluebot say something nice about <@${targetUserId}>`, authorId: friendUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			const response = sendSpy.mock.calls[0][0];
			// Should mention the target user
			expect(response).toContain(`<@${targetUserId}>`);
			expect(response).toContain("I think you're pretty blue!");
		});

		test('should find and mention user by username', async () => {
			const message = createMockMessage({ content: 'bluebot say something nice about FriendUser', authorId: friendUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			const response = sendSpy.mock.calls[0][0];
			// Should find FriendUser (ID: 222222222222222222) and mention them
			expect(response).toContain('<@222222222222222222>');
			expect(response).toContain("I think you're pretty blue!");
		});

		test('should find and mention user by nickname', async () => {
			const message = createMockMessage({ content: 'bluebot say something nice about FriendNickname', authorId: friendUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			const response = sendSpy.mock.calls[0][0];
			// Should find FriendUser by nickname and mention them
			expect(response).toContain('<@222222222222222222>');
			expect(response).toContain("I think you're pretty blue!");
		});

		test('should use fuzzy matching for usernames', async () => {
			const message = createMockMessage({ content: 'bluebot say something nice about frienduser', authorId: friendUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			const response = sendSpy.mock.calls[0][0];
			// Should find FriendUser even with different case
			expect(response).toContain('<@222222222222222222>');
		});

		test('should handle case when user is not found', async () => {
			const message = createMockMessage({ content: 'bluebot say something nice about NonExistentUser', authorId: friendUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			const response = sendSpy.mock.calls[0][0];
			// Should still respond but with the literal text
			expect(response).toContain('NonExistentUser');
			expect(response).toContain("I think you're pretty blue!");
		});
	});

	describe('Enemy user interactions', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		test('should give enemy user default response when saying "blue"', async () => {
			// Enemy user saying "blue" should still get the default response
			const message = createMockMessage({ content: 'I love blue', authorId: enemyUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			// Set up the BlueBotDiscordService with the mock client
			const discordService = BlueBotDiscordService.getInstance();
			discordService.setClient(message.client as Client);

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			expect(sendSpy).toHaveBeenCalledWith('Did somebody say Blu?');
		});

		test('should give enemy user insult when requesting nice about themselves by mention', async () => {
			const message = createMockMessage({ content: `bluebot say something nice about <@${enemyUserId}>`, authorId: enemyUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			// Set up the BlueBotDiscordService with the mock client
			const discordService = BlueBotDiscordService.getInstance();
			discordService.setClient(message.client as Client);

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			expect(sendSpy).toHaveBeenCalledWith('No way, they can suck my blue cane :unamused:');
		});

		test('should give enemy user insult when requesting nice about themselves by name', async () => {
			const message = createMockMessage({ content: 'bluebot say something nice about EnemyUser', authorId: enemyUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			// Set up the BlueBotDiscordService with the mock client
			const discordService = BlueBotDiscordService.getInstance();
			discordService.setClient(message.client as Client);

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			// Should get insult because fuzzy matching detects enemy's username
			expect(sendSpy).toHaveBeenCalledWith('No way, they can suck my blue cane :unamused:');
		});

		test('should give enemy user insult when requesting nice about themselves by nickname', async () => {
			const message = createMockMessage({ content: 'bluebot say something nice about EnemyNickname', authorId: enemyUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			// Set up the BlueBotDiscordService with the mock client
			const discordService = BlueBotDiscordService.getInstance();
			discordService.setClient(message.client as Client);

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			// Should get insult because fuzzy matching detects enemy's nickname
			expect(sendSpy).toHaveBeenCalledWith('No way, they can suck my blue cane :unamused:');
		});

		test('should give enemy user MURDER_RESPONSE when saying mean words within reply window', async () => {
			// First message: enemy says "blue"
			const { message: message1 } = await sendBlueMessage(enemyUserId);

			// Set up the BlueBotDiscordService with the mock client
			const discordService = BlueBotDiscordService.getInstance();
			discordService.setClient(message1.client as Client);

			// Advance time by 1 minute (within 5-minute reply window)
			vi.advanceTimersByTime(60 * 1000);

			// Second message: enemy says mean word
			const message2 = createMockMessage({
				content: 'fuck you bot',
				authorId: enemyUserId,
				timestamp: Date.now(),
			});
			const sendSpy2 = vi.fn();
			(message2.channel as TextChannel).send = sendSpy2;

			await processMessageByStrategy(message2 as Message);

			expect(sendSpy2).toHaveBeenCalledTimes(1);
			const response = sendSpy2.mock.calls[0][0];
			// Should get the MURDER_RESPONSE (Navy Seal copypasta)
			expect(response).toContain('What the fuck did you just fucking say about me');
			expect(response).toContain('Blue Mages');
			expect(response).toContain('300 confirmed spells');
		});

		test('should not trigger MURDER_RESPONSE for enemy user mean words outside reply window', async () => {
			// First message: enemy says "blue"
			const { message: message1 } = await sendBlueMessage(enemyUserId);

			// Set up the BlueBotDiscordService with the mock client
			const discordService = BlueBotDiscordService.getInstance();
			discordService.setClient(message1.client as Client);

			// Advance time by 6 minutes (outside 5-minute reply window)
			vi.advanceTimersByTime(6 * 60 * 1000);

			// Second message: enemy says mean word but outside window
			const message2 = createMockMessage({
				content: 'fuck you bot',
				authorId: enemyUserId,
				timestamp: Date.now(),
			});
			const sendSpy2 = vi.fn();
			(message2.channel as TextChannel).send = sendSpy2;

			await processMessageByStrategy(message2 as Message);

			// Should not respond because outside reply window
			expect(sendSpy2).not.toHaveBeenCalled();
		});

		test('should not trigger MURDER_RESPONSE for non-enemy user saying mean words', async () => {
			// First message: friend says "blue"
			await sendBlueMessage(friendUserId);

			// Advance time by 1 minute
			vi.advanceTimersByTime(60 * 1000);

			// Second message: friend says mean word
			const message2 = createMockMessage({
				content: 'fuck',
				authorId: friendUserId,
				timestamp: Date.now(),
			});
			const sendSpy2 = vi.fn();
			(message2.channel as TextChannel).send = sendSpy2;

			await processMessageByStrategy(message2 as Message);

			expect(sendSpy2).toHaveBeenCalledTimes(1);
			// Should get friendly confirm, not MURDER_RESPONSE
			expect(sendSpy2).toHaveBeenCalledWith('Somebody definitely said Blu!');
		});
	});

	describe('No response scenarios', () => {
		test('should not respond to empty messages', async () => {
			const message = createMockMessage({ content: '', authorId: friendUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).not.toHaveBeenCalled();
		});

		test('should not respond to unrelated messages', async () => {
			const unrelatedMessages = [
				'Hello everyone',
				'How are you doing?',
				'What a nice day',
				'Testing 123',
			];

			for (const content of unrelatedMessages) {
				const message = createMockMessage({ content, authorId: friendUserId });
				const sendSpy = vi.fn();
				(message.channel as TextChannel).send = sendSpy;

				await processMessageByStrategy(message as Message);

				expect(sendSpy).not.toHaveBeenCalled();
			}
		});
	});

	describe('Strategy priority', () => {
		test('nice request should take priority over blue detection', async () => {
			// Message contains both "blue" and a nice request
			const message = createMockMessage({ content: 'bluebot say something nice about blue things', authorId: friendUserId });
			const sendSpy = vi.fn();
			(message.channel as TextChannel).send = sendSpy;

			await processMessageByStrategy(message as Message);

			expect(sendSpy).toHaveBeenCalledTimes(1);
			const response = sendSpy.mock.calls[0][0];
			// Should get nice response, not "Did somebody say Blu?"
			expect(response).not.toBe('Did somebody say Blu?');
			expect(response).toContain('blue things');
		});
	});

	describe('Conversation flows', () => {
		test('should handle multiple blue messages in sequence', async () => {
			// First message
			await sendBlueMessage(friendUserId, 'I love blue');

			// Reset state so second message also gets default response
			resetStrategies();

			// Second message
			await sendBlueMessage(friendUserId, 'blue is the best color');
		});

		test('should handle mixed message types in sequence', async () => {
			// Blue message
			await sendBlueMessage(friendUserId, 'blue is great');

			// Reset state so subsequent messages don't trigger confirm
			resetStrategies();

			// Nice request
			const message2 = createMockMessage({ content: 'bluebot say something nice about Charlie', authorId: friendUserId });
			const sendSpy2 = vi.fn();
			(message2.channel as TextChannel).send = sendSpy2;

			await processMessageByStrategy(message2 as Message);
			expect(sendSpy2).toHaveBeenCalledTimes(1);
			const response = sendSpy2.mock.calls[0][0];
			expect(response).toContain('Charlie');

			// Unrelated message
			const message3 = createMockMessage({ content: 'hello world', authorId: friendUserId });
			const sendSpy3 = vi.fn();
			(message3.channel as TextChannel).send = sendSpy3;

			await processMessageByStrategy(message3 as Message);
			expect(sendSpy3).not.toHaveBeenCalled();
		});
	});

	describe('Edge cases', () => {
		test('should handle blue in different cases', async () => {
			const cases = ['BLUE', 'Blue', 'BLuE', 'bLuE'];

			for (const word of cases) {
				resetStrategies(); // Reset state between iterations
				const message = createMockMessage({ content: `I like ${word}`, authorId: friendUserId });
				const sendSpy = vi.fn();
				(message.channel as TextChannel).send = sendSpy;

				await processMessageByStrategy(message as Message);

				expect(sendSpy).toHaveBeenCalledWith('Did somebody say Blu?');
			}
		});

		test('should handle blue with punctuation', async () => {
			const messages = [
				'blue!',
				'blue?',
				'blue.',
				'blue,',
				'(blue)',
				'blue...',
			];

			for (const content of messages) {
				resetStrategies(); // Reset state between iterations
				const message = createMockMessage({ content, authorId: friendUserId });
				const sendSpy = vi.fn();
				(message.channel as TextChannel).send = sendSpy;

				await processMessageByStrategy(message as Message);

				expect(sendSpy).toHaveBeenCalledWith('Did somebody say Blu?');
			}
		});

		test('should not respond to blue as part of another word', async () => {
			const messages = [
				'blueberry',
				'bluetooth',
				'blueprint',
			];

			for (const content of messages) {
				const message = createMockMessage({ content, authorId: friendUserId });
				const sendSpy = vi.fn();
				(message.channel as TextChannel).send = sendSpy;

				await processMessageByStrategy(message as Message);

				// The regex uses word boundaries, so these compound words don't match
				expect(sendSpy).not.toHaveBeenCalled();
			}
		});
	});

	describe('Confirm strategy (reply window)', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		test('should confirm when user says "yes" within reply window', async () => {
			// First message: user says "blue"
			await sendBlueMessage(friendUserId, 'I love blue');

			// Advance time by 1 minute (within 5-minute reply window)
			vi.advanceTimersByTime(60 * 1000);

			// Second message: user confirms with "yes"
			const message2 = createMockMessage({
				content: 'yes',
				authorId: friendUserId,
				timestamp: Date.now(),
			});
			const sendSpy2 = vi.fn();
			(message2.channel as TextChannel).send = sendSpy2;

			await processMessageByStrategy(message2 as Message);
			expect(sendSpy2).toHaveBeenCalledWith('Somebody definitely said Blu!');
		});

		test('should confirm when user replies with message reference', async () => {
			// First message: user says "blue"
			await sendBlueMessage(friendUserId, 'blue is great');

			// Advance time by 2 minutes
			vi.advanceTimersByTime(2 * 60 * 1000);

			// Second message: user replies with message reference
			const message2 = createMockMessage({
				content: 'I sure did!',
				authorId: friendUserId,
				replyToMessageId: '123456789',
				timestamp: Date.now(),
			});
			const sendSpy2 = vi.fn();
			(message2.channel as TextChannel).send = sendSpy2;

			await processMessageByStrategy(message2 as Message);
			expect(sendSpy2).toHaveBeenCalledWith('Somebody definitely said Blu!');
		});

		test('should confirm on short messages within reply window', async () => {
			// Test that various short messages trigger confirm response
			// Note: After a confirm response, the reply window is closed, so we test each message separately
			const shortMessages = ['yep', 'yeah', 'sure did', 'I did', 'you got it'];

			for (const content of shortMessages) {
				// Reset and send initial blue message
				resetStrategies();
				await sendBlueMessage(friendUserId);

				// Advance time by 30 seconds (within 5-minute reply window)
				vi.advanceTimersByTime(30 * 1000);

				// Send short message that should trigger confirm
				const message = createMockMessage({
					content,
					authorId: friendUserId,
					timestamp: Date.now(),
				});
				const sendSpy = vi.fn();
				(message.channel as TextChannel).send = sendSpy;

				await processMessageByStrategy(message as Message);
				expect(sendSpy).toHaveBeenCalledWith('Somebody definitely said Blu!');
			}
		});

		test('should not confirm outside reply window', async () => {
			// First message: user says "blue"
			await sendBlueMessage(friendUserId);

			// Advance time by 6 minutes (outside 5-minute reply window)
			vi.advanceTimersByTime(6 * 60 * 1000);

			// Second message: user says "yes" but outside window
			const message2 = createMockMessage({
				content: 'yes',
				authorId: friendUserId,
				timestamp: Date.now(),
			});
			const sendSpy2 = vi.fn();
			(message2.channel as TextChannel).send = sendSpy2;

			await processMessageByStrategy(message2 as Message);
			// Should not respond because it's outside the window
			expect(sendSpy2).not.toHaveBeenCalled();
		});
	});
});

