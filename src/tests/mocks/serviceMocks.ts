import { AudioPlayerStatus, PlayerSubscription, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';
import { WebhookService } from '../../webhooks/webhookService';

// Constants for mock data
const MOCK_MESSAGE_ID = 'mock-message-id';
const MOCK_WEBHOOK_ID = 'mock-webhook-id';
const MOCK_WEBHOOK_NAME = 'mock-webhook-name';
const MOCK_WEBHOOK_DEFAULT_NAME = 'MockWebhook';

interface AudioService {
	play: () => Promise<void>;
	stop: () => Promise<void>;
}

export const createMockWebhookService = (): jest.Mocked<WebhookService> => ({
	writeMessage: jest.fn().mockImplementation((channel, message) => {
		const channelId = channel.id;
		return Promise.resolve({
			id: MOCK_MESSAGE_ID,
			content: message.content,
			author: { username: message.username },
			channelId
		});
	}),
	getChannelWebhook: jest.fn().mockResolvedValue({
		id: MOCK_WEBHOOK_ID,
		name: MOCK_WEBHOOK_NAME,
		send: jest.fn().mockResolvedValue({})
	}),
	getWebhookName: jest.fn().mockReturnValue(MOCK_WEBHOOK_DEFAULT_NAME),
	getWebhook: jest.fn().mockResolvedValue({
		id: MOCK_WEBHOOK_ID,
		name: MOCK_WEBHOOK_NAME,
		send: jest.fn().mockResolvedValue({})
	})
} as unknown as jest.Mocked<WebhookService>);

/**
 * Creates a mock for the default export of the webhookService module
 * Use this in your jest.mock call at the top of your test file
 *
 * Example usage:
 * ```
 * jest.mock('@/webhooks/webhookService', () => mockWebhookServiceDefault());
 * ```
 */
export const mockWebhookServiceDefault = (): Record<string, unknown> => ({
	__esModule: true,
	default: {
		writeMessage: jest.fn().mockResolvedValue({}),
		getChannelWebhook: jest.fn().mockResolvedValue({
			id: MOCK_WEBHOOK_ID,
			name: MOCK_WEBHOOK_NAME,
			send: jest.fn().mockResolvedValue({})
		}),
		getWebhookName: jest.fn().mockReturnValue(MOCK_WEBHOOK_DEFAULT_NAME),
		getWebhook: jest.fn().mockResolvedValue({
			id: MOCK_WEBHOOK_ID,
			name: MOCK_WEBHOOK_NAME,
			send: jest.fn().mockResolvedValue({})
		})
	},
	WebhookService: jest.fn()
});

export const createMockAudioService = (): jest.Mocked<AudioService> => ({
	play: jest.fn().mockResolvedValue(undefined),
	stop: jest.fn().mockResolvedValue(undefined)
} as unknown as jest.Mocked<AudioService>);

export const createMockDJCova = (): Record<string, jest.Mock> => ({
	start: jest.fn().mockResolvedValue(undefined),
	play: jest.fn(),
	stop: jest.fn(),
	pause: jest.fn(),
	changeVolume: jest.fn(),
	subscribe: jest.fn().mockReturnValue({} as PlayerSubscription),
	on: jest.fn((_: AudioPlayerStatus, callback: () => void) => callback()),
});

export const createMockVoiceConnection = (): Partial<VoiceConnection> => ({
	state: {
		status: VoiceConnectionStatus.Ready,
		adapter: {
			sendPayload: jest.fn(),
			destroy: jest.fn(),
		},
		// @ts-expect-error - Mock networking object
		networking: jest.fn()
	},
	subscribe: jest.fn().mockReturnValue({} as PlayerSubscription),
	destroy: jest.fn(),
	disconnect: jest.fn(),
});
