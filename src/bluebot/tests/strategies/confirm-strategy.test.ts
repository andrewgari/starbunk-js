import { describe, test, beforeEach } from 'vitest';
import { ConfirmStrategy } from '../../src/strategy/confirm-strategy';
import { testMultipleCases } from '../helpers/test-utils';

describe('ConfirmStrategy', () => {
	let strategy = new ConfirmStrategy();

	beforeEach(() => {
		strategy = new ConfirmStrategy();
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
