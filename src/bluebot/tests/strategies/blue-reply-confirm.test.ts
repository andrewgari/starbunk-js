import { describe, test, beforeEach } from 'vitest';
import { ReplyConfirmStrategy } from '../../src/strategy/blue-reply-confirm-strategy';
import { testMultipleCases } from '../helpers/test-utils';

describe('ConfirmStrategy', () => {
	let strategy = new ReplyConfirmStrategy();

	beforeEach(() => {
		strategy = new ReplyConfirmStrategy();
	});

	test('should acknowledge when somebody confirms that they said blue', async () => {
		await testMultipleCases(
			strategy,
			[
				'yes',
				'yep',
				'yeah',
				'no',
				'nope',
				'nah',
				'Yes, I did bluebot.',
				'No, I did not bluebot.',
				'You got it bluebot!',
				'When did I say blue?',
			],
			true
		);
	});
});
