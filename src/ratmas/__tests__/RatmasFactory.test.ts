import { Client } from 'discord.js';
import { RatmasFactory } from '../RatmasFactory';
import { RatmasService } from '../RatmasService';

describe('RatmasFactory', () => {
	const mockClient = {} as Client;

	describe('create', () => {
		it('creates a RatmasService instance', () => {
			const service = RatmasFactory.create(mockClient);
			expect(service).toBeInstanceOf(RatmasService);
		});

		it('passes client to RatmasService', () => {
			const service = RatmasFactory.create(mockClient);
			expect((service as any).client).toBe(mockClient);
		});
	});
});
