import {
	extractChannelIdFromMention,
	extractRoleIdFromMention,
	extractUserIdFromMention,
	formatChannelMention,
	formatRoleMention,
	formatUserMention
} from '../../utils/discordFormat';

describe('Discord Format Utilities', () => {
	describe('User mention formatting', () => {
		it('should format a user ID into a mention', () => {
			expect(formatUserMention('123456789')).toBe('<@123456789>');
		});

		it('should extract a user ID from a normal mention', () => {
			expect(extractUserIdFromMention('<@123456789>')).toBe('123456789');
		});

		it('should extract a user ID from a nickname mention', () => {
			expect(extractUserIdFromMention('<@!123456789>')).toBe('123456789');
		});

		it('should return null for invalid user mentions', () => {
			expect(extractUserIdFromMention('not a mention')).toBeNull();
			expect(extractUserIdFromMention('<@abc>')).toBeNull();
			expect(extractUserIdFromMention('<@123> extra')).toBeNull();
		});
	});

	describe('Role mention formatting', () => {
		it('should format a role ID into a mention', () => {
			expect(formatRoleMention('123456789')).toBe('<@&123456789>');
		});

		it('should extract a role ID from a mention', () => {
			expect(extractRoleIdFromMention('<@&123456789>')).toBe('123456789');
		});

		it('should return null for invalid role mentions', () => {
			expect(extractRoleIdFromMention('not a mention')).toBeNull();
			expect(extractRoleIdFromMention('<@&abc>')).toBeNull();
			expect(extractRoleIdFromMention('<@&123> extra')).toBeNull();
		});
	});

	describe('Channel mention formatting', () => {
		it('should format a channel ID into a mention', () => {
			expect(formatChannelMention('123456789')).toBe('<#123456789>');
		});

		it('should extract a channel ID from a mention', () => {
			expect(extractChannelIdFromMention('<#123456789>')).toBe('123456789');
		});

		it('should return null for invalid channel mentions', () => {
			expect(extractChannelIdFromMention('not a mention')).toBeNull();
			expect(extractChannelIdFromMention('<#abc>')).toBeNull();
			expect(extractChannelIdFromMention('<#123> extra')).toBeNull();
		});
	});
});
