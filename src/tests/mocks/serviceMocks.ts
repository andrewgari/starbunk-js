import { WebhookService } from '@/webhooks/webhookService';
import { AudioPlayerStatus, PlayerSubscription, VoiceConnection, VoiceConnectionStatus } from '@discordjs/voice';

interface AudioService {
	play: () => Promise<void>;
	stop: () => Promise<void>;
}

export const createMockWebhookService = (): jest.Mocked<WebhookService> => ({
	writeMessage: jest.fn().mockResolvedValue(undefined),
	getChannelWebhook: jest.fn().mockResolvedValue(undefined)
} as unknown as jest.Mocked<WebhookService>);

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
