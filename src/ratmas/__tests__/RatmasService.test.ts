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

		it('prevents starting when event is already active', async () => {
			await service.startRatmas(mockGuild);
			await expect(service.startRatmas(mockGuild)).rejects.toThrow('Ratmas is already active');
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

		it('rejects non-participants', async () => {
			await expect(service.setWishlist('invalid-id', wishlistUrl))
				.rejects.toThrow('You are not participating in Ratmas');
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
	});
});
