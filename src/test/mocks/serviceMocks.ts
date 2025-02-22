import { WebhookService } from '../../webhooks/webhookService';

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
