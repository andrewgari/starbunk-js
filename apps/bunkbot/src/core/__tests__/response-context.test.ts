import { createResponseContext, asCondition, asResponseGenerator } from '../response-context';
import { mockMessage } from '../../test-utils/testUtils';
import { Message, User } from 'discord.js';

describe('ResponseContext', () => {
	// Create a proper mock message with mentions
	function createMessageWithMentions(content: string): Message {
		const message = mockMessage({ content });

		// Add mock mentions object
		Object.defineProperty(message, 'mentions', {
			value: {
				users: new Map(),
				roles: new Map(),
				everyone: false,
			},
		});

		return message;
	}

	describe('createResponseContext', () => {
		it('should create a context with correct properties', () => {
			const message = createMessageWithMentions('Hello world');
			const context = createResponseContext(message);

			expect(context.content).toBe('Hello world');
			expect(context.author).toBe(message.author);
			expect(context.channel).toBe(message.channel);
			expect(context.guild).toBe(message.guild);
			expect(context.isFromBot).toBe(message.author.bot);
			expect(context.parts).toEqual(['Hello', 'world']);
		});

		it('should extract mentioned users', () => {
			const message = createMessageWithMentions('Hello <@123456789012345678>');

			// Mock the mentions property
			const mockUser = { id: '123456789012345678' } as User;
			message.mentions.users.set('123456789012345678', mockUser);

			const context = createResponseContext(message);
			expect(context.mentioned.has('123456789012345678')).toBe(true);
			expect(context.mentioned.size).toBe(1);
		});

		it('should extract mentioned roles', () => {
			const message = createMessageWithMentions('Hello <@&123456789012345678>');

			// Mock the mentions property
			message.mentions.roles.set('123456789012345678', { id: '123456789012345678' } as any);

			const context = createResponseContext(message);
			expect(context.mentionedRoles.has('123456789012345678')).toBe(true);
			expect(context.mentionedRoles.size).toBe(1);
		});
	});

	describe('Helper methods', () => {
		it('hasWord should detect whole words', () => {
			const message = createMessageWithMentions('Hello world');
			const context = createResponseContext(message);

			expect(context.hasWord('Hello')).toBe(true);
			expect(context.hasWord('world')).toBe(true);
			expect(context.hasWord('Hell')).toBe(false); // Not a whole word
			expect(context.hasWord('orld')).toBe(false); // Not a whole word
		});

		it('hasPhrase should detect substrings', () => {
			const message = createMessageWithMentions('Hello world');
			const context = createResponseContext(message);

			expect(context.hasPhrase('Hello')).toBe(true);
			expect(context.hasPhrase('world')).toBe(true);
			expect(context.hasPhrase('llo wo')).toBe(true); // Substring
			expect(context.hasPhrase('xyz')).toBe(false);
		});

		it('matchesRegex should test regex patterns', () => {
			const message = createMessageWithMentions('Hello world 123');
			const context = createResponseContext(message);

			expect(context.matchesRegex(/[Hh]ello/)).toBe(true);
			expect(context.matchesRegex(/\d+/)).toBe(true);
			expect(context.matchesRegex(/^Hello/)).toBe(true);
			expect(context.matchesRegex(/xyz/)).toBe(false);
		});

		it('getMentionedUsers should return array of users', () => {
			const message = createMessageWithMentions('Hello <@123456789012345678>');

			// Mock the mentions property
			const mockUser = { id: '123456789012345678' } as User;
			message.mentions.users.set('123456789012345678', mockUser);

			const context = createResponseContext(message);
			const mentionedUsers = context.getMentionedUsers();

			expect(mentionedUsers).toHaveLength(1);
			expect(mentionedUsers[0]).toBe(mockUser);
		});
	});

	describe('asCondition', () => {
		it('should convert a contextual condition to a standard condition', async () => {
			const contextCondition = jest.fn().mockReturnValue(true);
			const standardCondition = asCondition(contextCondition);

			const message = createMessageWithMentions('Hello world');
			const _result = await standardCondition(message);

			expect(result).toBe(true);
			expect(contextCondition).toHaveBeenCalledWith(
				expect.objectContaining({
					content: 'Hello world',
					message: message,
				}),
			);
		});

		it('should preserve async behavior', async () => {
			const contextCondition = jest.fn().mockResolvedValue(true);
			const standardCondition = asCondition(contextCondition);

			const message = createMessageWithMentions('Hello world');
			const _result = await standardCondition(message);

			expect(result).toBe(true);
			expect(contextCondition).toHaveBeenCalled();
		});
	});

	describe('asResponseGenerator', () => {
		it('should convert a contextual response generator to a standard one', async () => {
			const contextGenerator = jest.fn().mockReturnValue('Response text');
			const standardGenerator = asResponseGenerator(contextGenerator);

			const message = createMessageWithMentions('Hello world');
			const _result = await standardGenerator(message);

			expect(result).toBe('Response text');
			expect(contextGenerator).toHaveBeenCalledWith(
				expect.objectContaining({
					content: 'Hello world',
					message: message,
				}),
			);
		});

		it('should preserve async behavior', async () => {
			const contextGenerator = jest.fn().mockResolvedValue('Async response');
			const standardGenerator = asResponseGenerator(contextGenerator);

			const message = createMessageWithMentions('Hello world');
			const _result = await standardGenerator(message);

			expect(result).toBe('Async response');
			expect(contextGenerator).toHaveBeenCalled();
		});
	});
});
