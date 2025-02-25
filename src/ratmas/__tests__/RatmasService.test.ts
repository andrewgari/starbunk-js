import { Client, Collection, Guild, TextChannel, User } from 'discord.js';
import { ChannelManager, EventManager, MessageSender } from '../interfaces';
import { RatmasService } from '../RatmasService';
import { IRatmasStorage } from '../storage/RatmasStorage';
import { RatmasEvent } from '../types';

// Update type for accessing private members
type RatmasServicePrivate = {
	currentEvent: RatmasEvent;
};

describe('RatmasService', () => {
	let service: RatmasService;
	let mockClient: jest.Mocked<Client>;
	let mockStorage: jest.Mocked<IRatmasStorage>;
	let mockChannelManager: jest.Mocked<ChannelManager>;
	let mockEventManager: jest.Mocked<EventManager>;
	let mockMessageSender: jest.Mocked<MessageSender>;

	beforeEach(() => {
		mockClient = {
			users: {
				fetch: jest.fn().mockImplementation(async (id: string) => ({
					id,
					username: `User${id}`,
					send: jest.fn().mockResolvedValue(undefined)
				} as unknown as User))
			},
			channels: {
				fetch: jest.fn().mockResolvedValue(null)
			},
			guilds: { fetch: jest.fn() },
			application: null,
			options: {},
			emojis: new Collection()
		} as unknown as jest.Mocked<Client>;

		mockStorage = {
			save: jest.fn().mockResolvedValue(undefined),
			load: jest.fn().mockResolvedValue(null)
		} as unknown as jest.Mocked<IRatmasStorage>;

		mockChannelManager = {
			setupRatmasChannel: jest.fn(),
			archiveChannel: jest.fn()
		} as jest.Mocked<ChannelManager>;

		mockEventManager = {
			watchEvent: jest.fn(),
			createEvent: jest.fn()
		};

		mockMessageSender = {
			sendDM: jest.fn(),
			announceInChannel: jest.fn()
		};

		service = new RatmasService(
			mockClient,
			mockStorage,
			mockChannelManager,
			mockEventManager,
			mockMessageSender
		);
	});

	describe('startRatmas', () => {
		const mockGuild = {
			id: 'guild-123',
			roles: { cache: new Map() },
			scheduledEvents: {
				create: jest.fn().mockResolvedValue({ id: 'event-123' })
			}
		} as unknown as jest.Mocked<Guild>;

		const mockChannel = {
			id: 'channel-123',
			messages: {
				fetch: jest.fn().mockResolvedValue(new Collection())
			}
		} as unknown as TextChannel;

		beforeEach(() => {
			mockChannelManager.setupRatmasChannel.mockResolvedValue(mockChannel);
		});

		it('creates new Ratmas event with correct initial state', async () => {
			await service.startRatmas(mockGuild);
			expect(mockChannelManager.setupRatmasChannel).toHaveBeenCalledWith(mockGuild, expect.any(Number));
			expect(mockStorage.save).toHaveBeenCalledWith({
				channelId: 'channel-123',
				guildId: 'guild-123',
				eventId: 'event-123',
				isActive: true,
				participants: [],
				startDate: expect.any(String),
				openingDate: expect.any(String),
				year: expect.any(Number)
			});
		});

		it('calls setupRatmasChannel with the correct guild and current year', async () => {
			// Mock the current date to have a fixed year for testing
			const realDate = Date;
			const mockDate = class extends Date {
				constructor(...args: unknown[]) {
					if (args.length === 0) {
						super(2024, 0, 1); // January 1, 2024
					} else {
						super(...args as [number, number, number]);
					}
				}
				getFullYear(): number {
					return 2024;
				}
			};
			global.Date = mockDate as DateConstructor;

			await service.startRatmas(mockGuild);

			expect(mockChannelManager.setupRatmasChannel).toHaveBeenCalledTimes(1);
			expect(mockChannelManager.setupRatmasChannel).toHaveBeenCalledWith(mockGuild, 2024);

			// Restore original Date
			global.Date = realDate;
		});

		it('calls save with the correct serialized event data', async () => {
			// Mock the current date to have fixed dates for testing
			const realDate = Date;
			const fixedStartDate = new Date(2024, 0, 1); // January 1, 2024
			const fixedOpeningDate = new Date(2024, 0, 12); // January 12, 2024 (a Friday)

			const mockDate = class extends Date {
				constructor(...args: unknown[]) {
					if (args.length === 0) {
						super(fixedStartDate.getTime());
					} else {
						super(...args as [number, number, number]);
					}
				}
			};

			// Mock setDate to control the opening date calculation
			const originalSetDate = Date.prototype.setDate;
			Date.prototype.setDate = jest.fn().mockImplementation(function (this: Date, day: number) {
				if (this.getTime() === fixedStartDate.getTime() && day === fixedStartDate.getDate() + 14) {
					// This is the openingDate being set
					Object.setPrototypeOf(this, fixedOpeningDate);
					return day;
				}
				return originalSetDate.call(this, day);
			});

			global.Date = mockDate as DateConstructor;

			await service.startRatmas(mockGuild);

			// save is called twice: once in createServerEvent and once at the end of startRatmas
			expect(mockStorage.save).toHaveBeenCalledTimes(2);

			// Check the last call to save which contains the complete event data
			const lastCallArgs = mockStorage.save.mock.calls[mockStorage.save.mock.calls.length - 1][0];
			expect(lastCallArgs).toEqual({
				channelId: 'channel-123',
				guildId: 'guild-123',
				eventId: 'event-123',
				isActive: true,
				participants: [],
				startDate: fixedStartDate.toISOString(),
				openingDate: expect.any(String), // We can't precisely control the opening date calculation in this test
				year: 2024
			});

			// Restore original Date
			global.Date = realDate;
			Date.prototype.setDate = originalSetDate;
		});

		it('prevents starting when event is already active', async () => {
			await service.startRatmas(mockGuild);

			// Clear the mock calls to verify only the error case
			mockChannelManager.setupRatmasChannel.mockClear();
			mockStorage.save.mockClear();

			// Attempt to start again and verify the exact error
			await expect(service.startRatmas(mockGuild)).rejects.toThrow('Ratmas is already active');

			// Verify that setupRatmasChannel and save were not called during the error case
			expect(mockChannelManager.setupRatmasChannel).not.toHaveBeenCalled();
			expect(mockStorage.save).not.toHaveBeenCalled();
		});
	});

	describe('setWishlist', () => {
		const userId = 'user-123';
		const wishlistUrl = 'https://amazon.com/wishlist';

		beforeEach(async () => {
			// Setup active event with participant
			(service as unknown as RatmasServicePrivate).currentEvent = {
				participants: [
					[userId, { userId }]
				],
				isActive: true,
				startDate: new Date(),
				openingDate: new Date(),
				channelId: 'channel-123',
				guildId: 'guild-123',
				eventId: 'event-123',
				year: 2024
			};
		});

		it('sets wishlist for valid participant', async () => {
			await service.setWishlist(userId, wishlistUrl);

			const participant = (service as unknown as RatmasServicePrivate).currentEvent.participants
				.find(([id]) => id === userId)?.[1];
			expect(participant?.wishlistUrl).toBe(wishlistUrl);
			expect(mockStorage.save).toHaveBeenCalled();
		});

		it('rejects non-participants with specific error message', async () => {
			const nonParticipantIds = ['non-participant-1', 'non-participant-2', 'non-participant-3'];

			for (const nonParticipantId of nonParticipantIds) {
				// Verify the user is not in the participants list
				const participants = (service as unknown as RatmasServicePrivate).currentEvent.participants;
				expect(participants.find(([id]) => id === nonParticipantId)).toBeUndefined();

				// Attempt to set wishlist as non-participant
				const promise = service.setWishlist(nonParticipantId, wishlistUrl);

				// Verify the correct error is thrown
				await expect(promise).rejects.toThrow('You are not participating in Ratmas');
			}

			// Verify save was not called for any attempt
			expect(mockStorage.save).not.toHaveBeenCalled();
		});

		it('accepts various Amazon wishlist URL formats', async () => {
			const amazonUrls = [
				'https://www.amazon.com/hz/wishlist/ls/1A2B3C4D5E6F7',
				'https://amzn.to/3abcdef',
				'https://www.amazon.co.uk/hz/wishlist/ls/1A2B3C4D5E6F7',
				'https://www.amazon.ca/hz/wishlist/ls/1A2B3C4D5E6F7',
				'https://www.amazon.de/hz/wishlist/ls/1A2B3C4D5E6F7'
			];

			for (const url of amazonUrls) {
				mockStorage.save.mockClear();
				await service.setWishlist(userId, url);

				const participant = (service as unknown as RatmasServicePrivate).currentEvent.participants
					.find(([id]) => id === userId)?.[1];
				expect(participant?.wishlistUrl).toBe(url);
				expect(mockStorage.save).toHaveBeenCalled();
			}
		});

		it('updates existing wishlist when set multiple times', async () => {
			const initialUrl = 'https://www.amazon.com/hz/wishlist/ls/INITIAL123';
			const updatedUrl = 'https://www.amazon.com/hz/wishlist/ls/UPDATED456';

			// Set initial wishlist
			await service.setWishlist(userId, initialUrl);

			// Update wishlist
			await service.setWishlist(userId, updatedUrl);

			const participant = (service as unknown as RatmasServicePrivate).currentEvent.participants
				.find(([id]) => id === userId)?.[1];
			expect(participant?.wishlistUrl).toBe(updatedUrl);
			expect(mockStorage.save).toHaveBeenCalledTimes(2);
		});
	});

	describe('getTargetWishlist', () => {
		const santaId = 'santa-123';
		const targetId = 'target-123';
		const targetWishlist = 'https://amazon.com/wishlist';

		beforeEach(() => {
			const mockChannel = {
				id: 'channel-123',
				messages: {
					fetch: jest.fn().mockResolvedValue(new Collection())
				}
			} as unknown as TextChannel;

			mockClient.channels.fetch = jest.fn().mockResolvedValue(mockChannel);

			// Setup active event with participants
			(service as unknown as RatmasServicePrivate).currentEvent = {
				participants: [
					[santaId, { userId: santaId, assignedTargetId: targetId }],
					[targetId, { userId: targetId, wishlistUrl: targetWishlist }]
				],
				isActive: true,
				startDate: new Date(),
				openingDate: new Date(),
				channelId: 'channel-123',
				guildId: 'guild-123',
				eventId: 'event-123',
				year: 2024
			};
		});

		it('returns target wishlist for valid santa', async () => {
			const result = await service.getTargetWishlist(santaId);
			expect(result).toContain(targetWishlist);
		});

		it('handles missing wishlist gracefully', async () => {
			const targetParticipant = (service as unknown as RatmasServicePrivate).currentEvent.participants
				.find(([id]) => id === targetId)?.[1];
			if (targetParticipant) {
				targetParticipant.wishlistUrl = undefined;
			}
			const result = await service.getTargetWishlist(santaId);
			expect(result).toContain("hasn't set their wishlist yet");
		});

		it('includes target username in the response', async () => {
			mockClient.users.fetch = jest.fn().mockResolvedValue({
				id: targetId,
				username: 'TargetUser',
				send: jest.fn().mockResolvedValue(undefined)
			} as unknown as User);

			const result = await service.getTargetWishlist(santaId);
			expect(result).toContain('TargetUser');
			expect(result).toContain(targetWishlist);
		});

		it('searches channel history for wishlist if not explicitly set', async () => {
			// Remove the wishlist from the target
			const targetParticipant = (service as unknown as RatmasServicePrivate).currentEvent.participants
				.find(([id]) => id === targetId)?.[1];
			if (targetParticipant) {
				targetParticipant.wishlistUrl = undefined;
			}

			// Mock channel messages to include a wishlist message
			const wishlistMessage = {
				author: { id: targetId },
				content: 'https://amazon.com/my-wishlist-from-chat'
			};

			const messagesCollection = new Collection();
			messagesCollection.set('msg1', wishlistMessage);

			const mockChannel = {
				id: 'channel-123',
				messages: {
					fetch: jest.fn().mockResolvedValue(messagesCollection)
				}
			} as unknown as TextChannel;

			mockClient.channels.fetch = jest.fn().mockResolvedValue(mockChannel);
			mockClient.users.fetch = jest.fn().mockResolvedValue({
				id: targetId,
				username: 'TargetUser',
				send: jest.fn().mockResolvedValue(undefined)
			} as unknown as User);

			const result = await service.getTargetWishlist(santaId);

			expect(result).toContain('found in chat');
			expect(result).toContain('https://amazon.com/my-wishlist-from-chat');

			// Verify the wishlist was saved for future use
			expect(targetParticipant?.wishlistUrl).toBe('https://amazon.com/my-wishlist-from-chat');
		});

		it('sends a reminder to target if no wishlist is found', async () => {
			// Remove the wishlist from the target
			const targetParticipant = (service as unknown as RatmasServicePrivate).currentEvent.participants
				.find(([id]) => id === targetId)?.[1];
			if (targetParticipant) {
				targetParticipant.wishlistUrl = undefined;
			}

			// Mock empty channel messages
			const mockChannel = {
				id: 'channel-123',
				messages: {
					fetch: jest.fn().mockResolvedValue(new Collection())
				}
			} as unknown as TextChannel;

			const mockTargetUser = {
				id: targetId,
				username: 'TargetUser',
				send: jest.fn().mockResolvedValue(undefined)
			} as unknown as User;

			mockClient.channels.fetch = jest.fn().mockResolvedValue(mockChannel);
			mockClient.users.fetch = jest.fn().mockResolvedValue(mockTargetUser);

			const result = await service.getTargetWishlist(santaId);

			expect(result).toContain("hasn't set their wishlist yet");
			expect(result).toContain("I've sent them a reminder");
			expect(mockTargetUser.send).toHaveBeenCalledWith(
				expect.stringContaining("Someone is trying to view your Ratmas wishlist")
			);
		});

		it('rejects non-participants and handles error cases', async () => {
			// Test non-participants
			const nonParticipantId = 'non-participant-123';
			await expect(service.getTargetWishlist(nonParticipantId))
				.rejects.toThrow('You are not participating in Ratmas');

			// Test no target assigned
			const santaWithoutTarget = 'santa-without-target';
			(service as unknown as RatmasServicePrivate).currentEvent.participants.push(
				[santaWithoutTarget, { userId: santaWithoutTarget }]
			);
			await expect(service.getTargetWishlist(santaWithoutTarget))
				.rejects.toThrow('No target assigned yet');

			// Test invalid target
			const santaWithInvalidTarget = 'santa-invalid-target';
			(service as unknown as RatmasServicePrivate).currentEvent.participants.push(
				[santaWithInvalidTarget, { userId: santaWithInvalidTarget, assignedTargetId: 'non-existent-target' }]
			);
			await expect(service.getTargetWishlist(santaWithInvalidTarget))
				.rejects.toThrow('Target not found');

			// Test no active event
			(service as unknown as { currentEvent: null }).currentEvent = null;
			await expect(service.getTargetWishlist(santaId))
				.rejects.toThrow('No active Ratmas event');
		});

		it('prioritizes explicitly set wishlist over chat history', async () => {
			// Set an explicit wishlist
			const explicitWishlist = 'https://amazon.com/explicit-wishlist';
			const targetParticipant = (service as unknown as RatmasServicePrivate).currentEvent.participants
				.find(([id]) => id === targetId)?.[1];
			if (targetParticipant) {
				targetParticipant.wishlistUrl = explicitWishlist;
			}

			// Mock channel messages to include a different wishlist message
			const wishlistMessage = {
				author: { id: targetId },
				content: 'https://amazon.com/chat-wishlist'
			};

			const messagesCollection = new Collection();
			messagesCollection.set('msg1', wishlistMessage);

			const mockChannel = {
				id: 'channel-123',
				messages: {
					fetch: jest.fn().mockResolvedValue(messagesCollection)
				}
			} as unknown as TextChannel;

			mockClient.channels.fetch = jest.fn().mockResolvedValue(mockChannel);
			mockClient.users.fetch = jest.fn().mockResolvedValue({
				id: targetId,
				username: 'TargetUser',
				send: jest.fn().mockResolvedValue(undefined)
			} as unknown as User);

			const result = await service.getTargetWishlist(santaId);

			// Should use the explicit wishlist, not the one from chat
			expect(result).toContain(explicitWishlist);
			expect(result).not.toContain('found in chat');
			expect(result).not.toContain('https://amazon.com/chat-wishlist');
		});
	});
});
