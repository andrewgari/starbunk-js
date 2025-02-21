import { VoiceBot } from '../../src/starbunk/bots/voiceBot';
import { Message, VoiceChannel } from 'discord.js';
import { mock, MockProxy } from 'jest-mock-extended';

describe('VoiceBot', () => {
    let voiceBot: VoiceBot;
    let mockMessage: MockProxy<Message>;

    beforeEach(() => {
        voiceBot = new VoiceBot();
        mockMessage = mock<Message>();
    });

    test('should handle voice commands', async () => {
        mockMessage.content = '!play test';
        mockMessage.member = {
            voice: {
                channel: mock<VoiceChannel>()
            }
        } as any;

        const result = await voiceBot.handleMessage(mockMessage);
        expect(result).toBeDefined();
    });

    test('should require user to be in voice channel', async () => {
        mockMessage.content = '!play test';
        mockMessage.member = {
            voice: { channel: null }
        } as any;

        const result = await voiceBot.handleMessage(mockMessage);
        expect(result).toBeUndefined();
    });
}); 